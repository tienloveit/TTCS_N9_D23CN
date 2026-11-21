package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doCallRealMethod;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.Payment;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.BranchRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Báo cáo và dashboard lọc phạm vi (ngày, chi nhánh, phim, nhân viên, phương thức) trong truy vấn
 * DB. Các test này kiểm tra service hỏi đúng phạm vi và tổng hợp đúng từ kết quả trả về; cú pháp
 * truy vấn được kiểm tra trong {@link RepositoryQueryValidationTest}.
 */
class ReportQueryScopingTest {
  private static final LocalDate DAY = LocalDate.of(2026, 11, 20);

  private final BookingRepository bookings = mock(BookingRepository.class);
  private final ShowtimeRepository showtimes = mock(ShowtimeRepository.class);
  private final TicketRepository tickets = mock(TicketRepository.class);
  private final UserRepository users = mock(UserRepository.class);

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void revenueReportPassesManagerBranchAndFiltersToTheQueryAndSortsNewestPaymentFirst() {
    signIn(User.builder().id(1L).username("manager").role(UserRole.MANAGER).branchId(7L).build());
    Booking older = paid(1L, DAY.atTime(9, 0), 2, PaymentMethod.CASH);
    Booking newer = paid(2L, DAY.plusDays(1).atTime(9, 0), 1, PaymentMethod.CASH);
    when(bookings.findPaidByPaymentDate(
            eq(DAY.atStartOfDay()),
            eq(DAY.plusDays(2).atStartOfDay()),
            any(LocalDateTime.class),
            eq(7L),
            eq(5L),
            eq(9L),
            eq(PaymentMethod.CASH)))
        .thenReturn(List.of(older, newer));

    var report =
        new RevenueReportService(BackendServiceFixtures.CLOCK, bookings, users)
            .getReport(DAY, DAY.plusDays(1), null, 5L, 9L, PaymentMethod.CASH);

    assertThat(report.getRows()).extracting("bookingId").containsExactly(2L, 1L);
    assertThat(report.getSummary().getBookings()).isEqualTo(2);
    assertThat(report.getSummary().getTicketsSold()).isEqualTo(3);
    assertThat(report.getSummary().getRevenue()).isEqualByComparingTo("200000");
  }

  @Test
  void operationsReportCombinesGroupedCapacityWithPerShowtimeSales() {
    signIn(User.builder().id(1L).username("admin").role(UserRole.ADMIN).build());
    LocalDateTime start = DAY.atStartOfDay();
    LocalDateTime end = DAY.plusDays(1).atStartOfDay();
    Showtime busy = showtime(11L, start.plusHours(18));
    Showtime empty = showtime(12L, start.plusHours(21));
    when(showtimes.findStartingBetween(start, end, 3L)).thenReturn(List.of(busy, empty));
    when(tickets.countGroupedByShowtimeIds(List.of(11L, 12L)))
        .thenReturn(List.of(new Object[] {11L, 100L}, new Object[] {12L, 50L}));
    Booking pair = paid(1L, start.plusHours(1), 2, PaymentMethod.VNPAY);
    pair.setShowtime(busy);
    Booking single = paid(2L, start.plusHours(2), 1, PaymentMethod.CASH);
    single.setShowtime(busy);
    when(bookings.findPaidByShowtimeStart(start, end, 3L)).thenReturn(List.of(pair, single));
    when(bookings.findPaidByPaymentDate(
            eq(start), eq(end), any(LocalDateTime.class), eq(3L), isNull(), isNull(), isNull()))
        .thenReturn(List.of(single));
    when(bookings.countByStatusCreatedBetween(BookingStatus.PENDING, start, end, 3L))
        .thenReturn(4L);
    when(bookings.sumRefundedAmount(start, end, 3L)).thenReturn(new BigDecimal("150000"));
    Booking refundRequest = paid(3L, start.minusDays(1), 1, PaymentMethod.VNPAY);
    refundRequest.setStatus(BookingStatus.REFUND_REQUESTED);
    when(bookings.findByBranchIdAndStatusIn(3L, List.of(BookingStatus.REFUND_REQUESTED)))
        .thenReturn(List.of(refundRequest));
    var branches = mock(BranchRepository.class);
    when(branches.findById(3L)).thenReturn(Optional.of(Branch.builder().name("PTIT").build()));

    var report =
        new OperationsReportService(
                BackendServiceFixtures.CLOCK, bookings, showtimes, tickets, users, branches)
            .getDailyReport(DAY, 3L);

    var summary = report.getSummary();
    assertThat(summary.getTotalCapacity()).isEqualTo(150);
    assertThat(summary.getOccupancyRate()).isEqualTo(2.0);
    assertThat(summary.getCompletedBookings()).isEqualTo(1);
    assertThat(summary.getPendingBookings()).isEqualTo(4);
    assertThat(summary.getRefundedAmount()).isEqualByComparingTo("150000");
    assertThat(summary.getRefundRequests()).isEqualTo(1);
    assertThat(report.getBranchName()).isEqualTo("PTIT");
    assertThat(report.getShowtimeLoads())
        .extracting("showtimeId", "capacity", "ticketsSold")
        .containsExactly(
            org.assertj.core.groups.Tuple.tuple(11L, 100L, 3L),
            org.assertj.core.groups.Tuple.tuple(12L, 50L, 0L));
  }

  @Test
  void adminDashboardScopesManagersToTheirBranchAndReadsRecentBookingsFromTheQuery() {
    signIn(User.builder().id(1L).username("manager").role(UserRole.MANAGER).branchId(2L).build());
    LocalDateTime start = DAY.minusDays(29).atStartOfDay();
    LocalDateTime end = DAY.plusDays(1).atStartOfDay();
    when(bookings.findPaidByPaymentDate(
            eq(start), eq(end), any(LocalDateTime.class), eq(2L), isNull(), isNull(), isNull()))
        .thenReturn(List.of(paid(1L, DAY.atTime(10, 0), 2, PaymentMethod.CASH)));
    when(bookings.findRecent(2L, null, 6)).thenReturn(List.of(new Booking(), new Booking()));

    var dashboard =
        new AdminAnalyticsService(
                BackendServiceFixtures.CLOCK, bookings, showtimes, users, mock(BookingMapper.class))
            .getDashboard(null, DAY);

    assertThat(dashboard.getSummary().getPaidBookings()).isEqualTo(1);
    assertThat(dashboard.getSummary().getRevenue()).isEqualByComparingTo("100000");
    assertThat(dashboard.getRecentBookings()).hasSize(2);
    verify(bookings).findPaidByShowtimeStart(start, end, 2L);
    verify(showtimes).findStartingBetween(start, end, 2L);
  }

  @Test
  void findRecentKeepsTheNewestFirstOrderOfTheIdQuery() {
    doCallRealMethod().when(bookings).findRecent(any(), any(), anyInt());
    when(bookings.findRecentIds(eq(1L), isNull(), eq(PageRequest.of(0, 3))))
        .thenReturn(List.of(30L, 10L, 20L));
    when(bookings.findDetailedByIdIn(List.of(30L, 10L, 20L)))
        .thenReturn(
            new ArrayList<>(
                IntStream.of(10, 20, 30)
                    .mapToObj(id -> Booking.builder().id((long) id).build())
                    .toList()));

    assertThat(bookings.findRecent(1L, null, 3)).extracting("id").containsExactly(30L, 10L, 20L);
  }

  @Test
  void findRecentSkipsTheDetailQueryWhenThereAreNoBookings() {
    doCallRealMethod().when(bookings).findRecent(any(), any(), anyInt());
    when(bookings.findRecentIds(any(), any(), any(Pageable.class))).thenReturn(List.of());

    assertThat(bookings.findRecent(null, 4L, 6)).isEmpty();
    verify(bookings, never()).findDetailedByIdIn(any());
  }

  private void signIn(User user) {
    when(users.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(user.getUsername(), "unused", List.of()));
  }

  private static Showtime showtime(Long id, LocalDateTime startTime) {
    Branch branch = Branch.builder().branchId(3L).name("PTIT").build();
    return Showtime.builder()
        .id(id)
        .startTime(startTime)
        .room(Room.builder().name("P" + id).branch(branch).build())
        .movie(Movie.builder().id(id * 10).movieName("Movie " + id).build())
        .build();
  }

  private static Booking paid(
      Long id, LocalDateTime paidAt, int ticketCount, PaymentMethod method) {
    return Booking.builder()
        .id(id)
        .bookingCode("BK-" + id)
        .showtime(showtime(100L + id, paidAt))
        .createdAt(paidAt)
        .totalAmount(new BigDecimal("100000"))
        .status(BookingStatus.COMPLETED)
        .payment(
            Payment.builder()
                .paymentMethod(method)
                .paymentStatus(PaymentStatus.PAID)
                .paidAt(paidAt)
                .build())
        .tickets(
            IntStream.range(0, ticketCount)
                .mapToObj(i -> Ticket.builder().price(new BigDecimal("50000")).build())
                .toList())
        .build();
  }
}
