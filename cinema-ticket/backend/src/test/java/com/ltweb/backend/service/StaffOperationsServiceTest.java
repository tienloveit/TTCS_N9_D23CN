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
        when(showtimes.findAll()).thenReturn(List.of());
        LocalDateTime today = LocalDate.now().atStartOfDay();
        when(bookings.findAll()).thenReturn(List.of(
                sale(staff, 1L, today, PaymentMethod.CASH),
                sale(staff, 1L, today, PaymentMethod.CARD),
                sale(staff, 1L, today, PaymentMethod.VNPAY),
                sale(staff, 1L, today.minusDays(1), PaymentMethod.CASH),
                sale(staff, 2L, today, PaymentMethod.CASH),
                sale(User.builder().id(2L).build(), 1L, today, PaymentMethod.CASH)));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("staff", "unused"));

        var service = new StaffOperationsService(bookings, showtimes, tickets, users, mapper);
        var result = service.getDashboard().getSummary();

        assertThat(result.getPaidBookings()).isEqualTo(3);
        assertThat(result.getRevenue()).isEqualByComparingTo("300000");
        assertThat(result.getCashRevenue()).isEqualByComparingTo("100000");
        assertThat(result.getCardRevenue()).isEqualByComparingTo("200000");
        assertThat(result.getTicketsSold()).isEqualTo(3);
    }

    private Booking sale(User staff, Long branchId, LocalDateTime paidAt, PaymentMethod method) {
        Branch branch = Branch.builder().branchId(branchId).build();
        Room room = Room.builder().branch(branch).build();
        return Booking.builder()
                .staffUser(staff)
                .showtime(Showtime.builder().room(room).build())
                .createdAt(paidAt)
                .totalAmount(new BigDecimal("100000"))
                .status(BookingStatus.COMPLETED)
                .payment(Payment.builder().paymentMethod(method).paymentStatus(PaymentStatus.PAID).paidAt(paidAt).build())
                .tickets(List.of(Ticket.builder().build()))
                .build();
    }
}
