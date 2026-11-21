package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ltweb.backend.dto.request.BookingSearchRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.BookingSearchFilter;
import com.ltweb.backend.repository.BookingSearchRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Quyền và tham số của {@code GET /booking/search}; dữ liệu thật xem BookingQueriesDatabaseTest.
 */
class BookingSearchServiceTest {
  private final BookingRepository bookings = mock(BookingRepository.class);
  private final UserRepository users = mock(UserRepository.class);
  private final BookingMapper mapper = mock(BookingMapper.class);
  private final BookingQueryService service =
      new BookingQueryService(
          bookings,
          mapper,
          new CurrentUserProvider(users),
          new BookingAccessPolicy(),
          new RefundPolicy(BackendServiceFixtures.settings(), BackendServiceFixtures.CLOCK));

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void adminCanFilterAnyBranchAndGetsPageInIdOrderWithTotals() {
    signIn(UserRole.ADMIN, null);
    stubPage(List.of(30L, 10L), 17);
    when(bookings.findDetailedByIdIn(List.of(30L, 10L)))
        .thenReturn(List.of(Booking.builder().id(10L).build(), Booking.builder().id(30L).build()));
    when(mapper.toBookingResponse(any()))
        .thenAnswer(call -> response(((Booking) call.getArgument(0)).getId()));
    when(bookings.totals(any()))
        .thenReturn(new BookingSearchRepository.Totals(4, 2, new BigDecimal("500000")));

    var page =
        service.searchBookings(
            new BookingSearchRequest(
                "bk",
                BookingStatus.COMPLETED,
                "PAID",
                9L,
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 2),
                null,
                null,
                1,
                2));

    BookingSearchFilter filter = capturedFilter(PageRequest.of(1, 2));
    assertThat(filter.branchId()).isEqualTo(9L);
    assertThat(filter.paymentStatus()).isEqualTo(PaymentStatus.PAID);
    assertThat(filter.createdFrom()).isEqualTo(LocalDate.of(2026, 11, 1).atStartOfDay());
    assertThat(filter.createdTo()).isEqualTo(LocalDate.of(2026, 11, 3).atStartOfDay());
    assertThat(page.getContent())
        .extracting(BookingResponse::getBookingId)
        .containsExactly(30L, 10L);
    assertThat(page.getTotalElements()).isEqualTo(17);
    assertThat(page.getTotalPages()).isEqualTo(9);
    assertThat(page.getSummary().getCompleted()).isEqualTo(4);
    assertThat(page.getSummary().getPaidAmount()).isEqualByComparingTo("500000");
  }

  @Test
  void branchOperatorsAreForcedToTheirBranch() {
    signIn(UserRole.STAFF, 3L);
    stubPage(List.of(), 0);
    when(bookings.totals(any()))
        .thenReturn(new BookingSearchRepository.Totals(0, 0, BigDecimal.ZERO));

    service.searchBookings(request(null, null, LocalDate.of(2026, 11, 20)));

    BookingSearchFilter filter = capturedFilter(PageRequest.of(0, 15));
    assertThat(filter.branchId()).isEqualTo(3L);
    assertThat(filter.checkedInFrom()).isEqualTo(LocalDate.of(2026, 11, 20).atStartOfDay());
    assertThat(filter.checkedInTo()).isEqualTo(LocalDate.of(2026, 11, 21).atStartOfDay());
    verify(bookings, never()).findDetailedByIdIn(any());
  }

  @Test
  void branchOperatorAskingForAnotherBranchIsDenied() {
    signIn(UserRole.MANAGER, 3L);
    assertThatThrownBy(() -> service.searchBookings(request(4L, null, null)))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  void customersAndUnknownPaymentStatusesGetAnEmptyPageWithoutQuerying() {
    signIn(UserRole.USER, null);
    assertThat(service.searchBookings(request(null, null, null)).getContent()).isEmpty();

    signIn(UserRole.ADMIN, null);
    var page = service.searchBookings(request(null, "FAILED", null));
    assertThat(page.getContent()).isEmpty();
    assertThat(page.getSummary().getPaidAmount()).isEqualByComparingTo("0");
    verify(bookings, never()).searchIds(any(), any());
  }

  @Test
  void noTransactionSelectsBookingsWithoutPaymentStatusAndSizeIsCapped() {
    signIn(UserRole.ADMIN, null);
    stubPage(List.of(), 0);
    when(bookings.totals(any()))
        .thenReturn(new BookingSearchRepository.Totals(0, 0, BigDecimal.ZERO));

    service.searchBookings(
        new BookingSearchRequest(
            null, null, "NO_TRANSACTION", null, null, null, null, null, -3, 5000));

    BookingSearchFilter filter = capturedFilter(PageRequest.of(0, BookingSearchRequest.MAX_SIZE));
    assertThat(filter.noPaymentStatus()).isTrue();
    assertThat(filter.paymentStatus()).isNull();
  }

  private BookingSearchRequest request(Long branchId, String paymentStatus, LocalDate checkedIn) {
    return new BookingSearchRequest(
        null, null, paymentStatus, branchId, null, null, null, checkedIn, null, null);
  }

  private void stubPage(List<Long> ids, long total) {
    when(bookings.searchIds(any(), any()))
        .thenAnswer(call -> new PageImpl<>(ids, call.<Pageable>getArgument(1), total));
  }

  private BookingSearchFilter capturedFilter(Pageable expectedPage) {
    ArgumentCaptor<BookingSearchFilter> filter = ArgumentCaptor.forClass(BookingSearchFilter.class);
    verify(bookings).searchIds(filter.capture(), eq(expectedPage));
    return filter.getValue();
  }

  private void signIn(UserRole role, Long branchId) {
    User user = User.builder().id(1L).username("u-" + role).role(role).branchId(branchId).build();
    when(users.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(user.getUsername(), "unused", List.of()));
  }

  private static BookingResponse response(Long id) {
    return BookingResponse.builder().bookingId(id).build();
  }
}
