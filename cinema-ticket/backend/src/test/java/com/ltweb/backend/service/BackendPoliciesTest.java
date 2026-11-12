package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.UserRepository;
import java.time.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class BackendPoliciesTest {
  private final BookingAccessPolicy access = new BookingAccessPolicy();
  private final User customer = User.builder().id(1L).role(UserRole.USER).build();
  private final Booking booking =
      Booking.builder()
          .user(customer)
          .status(BookingStatus.COMPLETED)
          .showtime(
              Showtime.builder()
                  .room(Room.builder().branch(Branch.builder().branchId(5L).build()).build())
                  .build())
          .build();

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @ParameterizedTest
  @EnumSource(
      value = UserRole.class,
      names = {"ADMIN", "MANAGER", "STAFF", "USER"})
  void permissionsRemainSpecificToEachOperation(UserRole role) {
    User operator = User.builder().id(2L).role(role).branchId(5L).status(UserStatus.ACTIVE).build();
    if (role == UserRole.USER) {
      assertDenied(() -> access.requireCanView(booking, operator), ErrorCode.UNAUTHORIZED);
    } else {
      access.requireCanView(booking, operator);
      access.requireCanManage(booking, operator);
    }
    if (role == UserRole.ADMIN || role == UserRole.MANAGER)
      access.requireCanRefund(booking, operator);
    else assertDenied(() -> access.requireCanRefund(booking, operator), ErrorCode.ACCESS_DENIED);
    if (role == UserRole.ADMIN || role == UserRole.STAFF)
      access.requireCanCancel(booking, operator);
    else assertDenied(() -> access.requireCanCancel(booking, operator), ErrorCode.UNAUTHORIZED);
    if (role == UserRole.ADMIN || role == UserRole.STAFF)
      access.requireCanCreateAtCounter(booking.getShowtime(), operator);
    else
      assertDenied(
          () -> access.requireCanCreateAtCounter(booking.getShowtime(), operator),
          ErrorCode.UNAUTHORIZED);
    access.requireOwner(booking, customer);
    assertDenied(() -> access.requireOwner(booking, operator), ErrorCode.UNAUTHORIZED);
  }

  @Test
  void branchMismatchMissingBranchAndDisabledAccountAreDenied() {
    User manager =
        User.builder().id(2L).role(UserRole.MANAGER).branchId(6L).status(UserStatus.ACTIVE).build();
    assertDenied(() -> access.requireCanRefund(booking, manager), ErrorCode.ACCESS_DENIED);
    manager.setBranchId(null);
    assertDenied(() -> access.requireCanView(booking, manager), ErrorCode.UNAUTHORIZED);
    assertDenied(() -> access.requireRefundOperator(manager, true), ErrorCode.ACCESS_DENIED);
    manager.setBranchId(5L);
    manager.setStatus(UserStatus.BLOCKED);
    assertDenied(() -> access.requireRefundOperator(manager, false), ErrorCode.ACCESS_DENIED);
  }

  @Test
  void refundCutoffUsesInjectedClockAndApprovalDoesNotReapplyRequestWindow() {
    SystemSettingService settings = mock(SystemSettingService.class);
    when(settings.getInt(SystemSettingService.REFUND_WINDOW_HOURS, 24)).thenReturn(12);
    Clock clock = Clock.fixed(Instant.parse("2026-11-12T05:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    RefundPolicy policy = new RefundPolicy(settings, clock);
    booking.getPayment().setPaymentStatus(PaymentStatus.PAID);
    booking.getPayment().setPaidAt(LocalDateTime.of(2026, 11, 12, 0, 0));
    assertThat(policy.deadline(booking, policy.windowHours()))
        .isEqualTo(LocalDateTime.of(2026, 11, 12, 12, 0));
    policy.requireCanRequest(booking);
    booking.getPayment().setPaidAt(booking.getPayment().getPaidAt().minusNanos(1));
    assertDenied(() -> policy.requireCanRequest(booking), ErrorCode.REFUND_WINDOW_EXPIRED);
    booking.setStatus(BookingStatus.REFUND_REQUESTED);
    policy.requireCanApprove(booking);
    booking.getTickets().add(Ticket.builder().checkedInAt(LocalDateTime.now(clock)).build());
    assertDenied(() -> policy.requireCanApprove(booking), ErrorCode.BOOKING_CANNOT_REFUND);
    when(settings.getInt(SystemSettingService.REFUND_WINDOW_HOURS, 24)).thenReturn(0);
    assertThat(policy.windowHours()).isEqualTo(1);
  }

  @Test
  void currentUserResolutionRejectsAnonymousAndNeverCachesPreviousAccount() {
    UserRepository users = mock(UserRepository.class);
    CurrentUserProvider provider = new CurrentUserProvider(users);
    assertThat(provider.getOrNull()).isNull();
    SecurityContextHolder.getContext()
        .setAuthentication(
            new AnonymousAuthenticationToken(
                "key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
    assertDenied(() -> provider.requireUser(ErrorCode.ACCESS_DENIED), ErrorCode.ACCESS_DENIED);
    verifyNoInteractions(users);
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken("customer", null, List.of()));
    when(users.findByUsername("customer")).thenReturn(Optional.of(customer), Optional.empty());
    assertThat(provider.requireUser()).isSameAs(customer);
    assertDenied(provider::requireUser, ErrorCode.USER_NOT_FOUND);
  }

  private void assertDenied(Runnable action, ErrorCode code) {
    assertThatThrownBy(action::run)
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(code);
  }
}
