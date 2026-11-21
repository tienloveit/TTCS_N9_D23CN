package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class StaffOperationsServiceTest {
  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void dashboardCountsTodaysStaffSalesWithoutAShiftAndSeparatesBranchAndDate() {
    var bookings = mock(BookingRepository.class);
    var showtimes = mock(ShowtimeRepository.class);
    var tickets = mock(TicketRepository.class);
    var users = mock(UserRepository.class);
    var mapper = mock(BookingMapper.class);
    User staff = User.builder().id(1L).username("staff").role(UserRole.STAFF).branchId(1L).build();
    when(users.findByUsername("staff")).thenReturn(Optional.of(staff));
    LocalDateTime today = LocalDate.now(BackendServiceFixtures.CLOCK).atStartOfDay();
    // Lọc nhân viên/chi nhánh/ngày nằm trong truy vấn: chỉ trả dữ liệu khi service hỏi đúng phạm
    // vi.
    Booking cashSale = sale(staff, 1L, today, PaymentMethod.CASH);
    when(bookings.findStaffBookingsByBusinessDate(1L, 1L, today, today.plusDays(1)))
        .thenReturn(
            List.of(
                cashSale,
                sale(staff, 1L, today, PaymentMethod.CARD),
                sale(staff, 1L, today, PaymentMethod.VNPAY)));
    when(bookings.findStaffCashMovements(1L, 1L, today, today.plusDays(1)))
        .thenReturn(List.of(cashSale));
    when(tickets.countCheckedInBetween(1L, today, today.plusDays(1))).thenReturn(4L);
    when(bookings.countByStatusInBranch(BookingStatus.REFUND_REQUESTED, 1L)).thenReturn(2L);
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken("staff", "unused", java.util.List.of()));

    var service =
        new StaffOperationsService(
            BackendServiceFixtures.CLOCK, bookings, showtimes, tickets, users, mapper);
    var result = service.getDashboard().getSummary();

    assertThat(result.getPaidBookings()).isEqualTo(3);
    assertThat(result.getRevenue()).isEqualByComparingTo("300000");
    assertThat(result.getCashRevenue()).isEqualByComparingTo("100000");
    assertThat(result.getCardRevenue()).isEqualByComparingTo("200000");
    assertThat(result.getTicketsSold()).isEqualTo(3);
    assertThat(result.getCashCollected()).isEqualByComparingTo("100000");
    assertThat(result.getCheckedInTickets()).isEqualTo(4);
    assertThat(result.getRefundRequests()).isEqualTo(2);
  }

  @Test
  void cashDrawerSubtractsCashRefundedTodayIncludingEarlierSales() {
    var bookings = mock(BookingRepository.class);
    var showtimes = mock(ShowtimeRepository.class);
    var users = mock(UserRepository.class);
    User staff = User.builder().id(1L).username("staff").role(UserRole.STAFF).branchId(1L).build();
    when(users.findByUsername("staff")).thenReturn(Optional.of(staff));
    LocalDateTime now = LocalDateTime.now(BackendServiceFixtures.CLOCK);
    LocalDateTime today = now.toLocalDate().atStartOfDay();
    Booking keptToday = sale(staff, 1L, today.plusMinutes(1), PaymentMethod.CASH);
    Booking refundedSameDay =
        refunded(sale(staff, 1L, today.plusMinutes(2), PaymentMethod.CASH), today.plusMinutes(3));
    Booking refundedFromYesterday =
        refunded(sale(staff, 1L, today.minusHours(5), PaymentMethod.CASH), today.plusMinutes(4));
    // Đơn VNPay và đơn của nhân viên khác bị truy vấn loại; service chỉ nhận đơn tiền mặt của
    // mình có thu hoặc hoàn trong ngày.
    when(bookings.findStaffCashMovements(1L, 1L, today, today.plusDays(1)))
        .thenReturn(List.of(keptToday, refundedSameDay, refundedFromYesterday));
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken("staff", "unused", java.util.List.of()));

    var result =
        new StaffOperationsService(
                BackendServiceFixtures.CLOCK,
                bookings,
                showtimes,
                mock(TicketRepository.class),
                users,
                mock(BookingMapper.class))
            .getDashboard()
            .getSummary();

    assertThat(result.getCashSales()).isEqualTo(2);
    assertThat(result.getCashCollected()).isEqualByComparingTo("200000");
    assertThat(result.getCashRefunds()).isEqualTo(2);
    assertThat(result.getCashRefunded()).isEqualByComparingTo("200000");
    assertThat(result.getCashExpected()).isEqualByComparingTo("0");
  }

  private static Booking refunded(Booking booking, LocalDateTime refundedAt) {
    booking.setStatus(BookingStatus.REFUNDED);
    booking.getPayment().setPaymentStatus(PaymentStatus.REFUNDED);
    booking.getPayment().setRefundedAt(refundedAt);
    booking.getPayment().setRefundAmount(booking.getTotalAmount());
    return booking;
  }

  private static Booking sale(
      User staff, Long branchId, LocalDateTime paidAt, PaymentMethod method) {
    Branch branch = Branch.builder().branchId(branchId).build();
    Room room = Room.builder().branch(branch).build();
    return Booking.builder()
        .staffUser(staff)
        .showtime(Showtime.builder().room(room).build())
        .createdAt(paidAt)
        .totalAmount(new BigDecimal("100000"))
        .status(BookingStatus.COMPLETED)
        .payment(
            Payment.builder()
                .paymentMethod(method)
                .paymentStatus(PaymentStatus.PAID)
                .paidAt(paidAt)
                .build())
        .tickets(List.of(Ticket.builder().build()))
        .build();
  }
}
