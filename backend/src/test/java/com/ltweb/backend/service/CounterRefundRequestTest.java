package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.*;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

/** Nhân viên gửi yêu cầu hoàn thay khách vãng lai cho đơn bán tại quầy. */
class CounterRefundRequestTest {
  private final BookingRepository bookings = mock(BookingRepository.class);
  private final UserRepository users = mock(UserRepository.class);
  private final SystemSettingService settings = mock(SystemSettingService.class);
  private final AuditLogService audit = mock(AuditLogService.class);
  private final NotificationService notifications = mock(NotificationService.class);
  private BookingService service;

  private final Branch branch = Branch.builder().branchId(1L).name("Branch").build();
  private final Showtime showtime =
      Showtime.builder().id(3L).room(Room.builder().id(2L).branch(branch).build()).build();
  private final User guest =
      User.builder().id(1L).username("guest_0901234567").role(UserRole.USER).build();
  private final User seller =
      User.builder().id(7L).username("staff").role(UserRole.STAFF).branchId(1L).build();
  private Booking booking;

  @BeforeEach
  void setup() {
    service =
        BackendServiceFixtures.booking(
            bookings,
            mock(ShowtimeRepository.class),
            mock(TicketRepository.class),
            mock(FoodRepository.class),
            users,
            mock(org.springframework.data.redis.core.StringRedisTemplate.class),
            mock(org.springframework.messaging.simp.SimpMessagingTemplate.class),
            mapper(),
            mock(org.springframework.security.crypto.password.PasswordEncoder.class),
            mock(org.springframework.context.ApplicationEventPublisher.class),
            mock(PromotionService.class),
            audit,
            settings,
            notifications,
            mock(FoodStockService.class),
            mock(BookingRefundService.class));
    when(settings.getInt(SystemSettingService.REFUND_WINDOW_HOURS, 24)).thenReturn(24);
    booking =
        Booking.builder()
            .id(5L)
            .bookingCode("BK-20261121-ABCDEFGH")
            .user(guest)
            .showtime(showtime)
            .staffUser(seller)
            .status(BookingStatus.COMPLETED)
            .build();
    booking.getPayment().setPaymentStatus(PaymentStatus.PAID);
    booking.getPayment().setPaymentMethod(PaymentMethod.CASH);
    booking.getPayment().setPaidAt(LocalDateTime.now().minusMinutes(10));
    when(bookings.findByIdForUpdate(5L)).thenReturn(Optional.of(booking));
  }

  @AfterEach
  void clear() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void staffOfBranchRequestsRefundForCounterSaleAndIsAudited() {
    actAs(seller);

    service.requestRefund(5L, "  Bán nhầm suất chiếu  ");

    assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
    assertThat(booking.getPayment().getRefundReason()).isEqualTo("Bán nhầm suất chiếu");
    verify(notifications).notifyRefundRequest(1L, 5L, booking.getBookingCode());
    verify(audit)
        .record(eq(AuditAction.REFUND_REQUESTED), eq("Booking"), eq(5L), contains("Bán nhầm"));
  }

  @Test
  void staffMustGiveReasonWhenRequestingForCustomer() {
    actAs(seller);

    assertError(() -> service.requestRefund(5L, "   "), ErrorCode.REFUND_REASON_REQUIRED);
    assertThat(booking.getStatus()).isEqualTo(BookingStatus.COMPLETED);
  }

  @Test
  void staffOfAnotherBranchCannotRequest() {
    actAs(User.builder().id(8L).username("other").role(UserRole.STAFF).branchId(2L).build());

    assertError(() -> service.requestRefund(5L, "Bán nhầm"), ErrorCode.UNAUTHORIZED);
  }

  @Test
  void staffCannotRequestRefundForOnlineBooking() {
    booking.setStaffUser(null);
    actAs(seller);

    assertError(() -> service.requestRefund(5L, "Khách gọi điện"), ErrorCode.UNAUTHORIZED);
  }

  @Test
  void requestOnBehalfStillFollowsCheckInRule() {
    booking.getTickets().add(Ticket.builder().checkedInAt(LocalDateTime.now()).build());
    actAs(seller);

    assertError(() -> service.requestRefund(5L, "Bán nhầm"), ErrorCode.BOOKING_CANNOT_REFUND);
  }

  @Test
  void ownerRequestIsNotAuditedAsCounterRequest() {
    actAs(guest);

    service.requestRefund(5L, "");

    assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
    verify(audit, never()).record(eq(AuditAction.REFUND_REQUESTED), any(), any(), any());
  }

  private void actAs(User user) {
    when(users.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(user.getUsername(), null, java.util.List.of()));
  }

  private static BookingMapper mapper() {
    BookingMapper mapper = mock(BookingMapper.class);
    when(mapper.toBookingResponse(any()))
        .thenAnswer(c -> BookingResponse.builder().bookingId(5L).build());
    return mapper;
  }

  private static void assertError(Runnable action, ErrorCode expected) {
    assertThatThrownBy(action::run)
        .isInstanceOfSatisfying(
            AppException.class, error -> assertThat(error.getErrorCode()).isEqualTo(expected));
  }
}
