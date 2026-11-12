package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

class BookingRefundDeadlineTest {
    private final BookingRepository bookings = mock(BookingRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final SystemSettingService settings = mock(SystemSettingService.class);
    private final BookingMapper mapper = mock(BookingMapper.class);
    private final BookingService service = mock(BookingService.class, CALLS_REAL_METHODS);
    private final User user = User.builder().id(1L).username("customer").role(UserRole.USER).build();
    private final LocalDateTime paidAt = LocalDateTime.now().minusHours(2);
    private final Booking booking = Booking.builder().id(5L).user(user)
            .status(BookingStatus.COMPLETED).build();

    @BeforeEach void setup() {
        booking.getPayment().setPaymentStatus(PaymentStatus.PAID);
        booking.getPayment().setPaidAt(paidAt);
        ReflectionTestUtils.setField(service, "bookingRepository", bookings);
        ReflectionTestUtils.setField(service, "userRepository", users);
        ReflectionTestUtils.setField(service, "systemSettingService", settings);
        ReflectionTestUtils.setField(service, "bookingMapper", mapper);
        when(users.findByUsername("customer")).thenReturn(Optional.of(user));
        when(bookings.findByUserId(1L)).thenReturn(List.of(booking));
        when(bookings.findById(5L)).thenReturn(Optional.of(booking));
        when(mapper.toBookingResponse(any())).thenAnswer(c -> BookingResponse.builder().bookingId(5L).build());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("customer", null));
    }

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @ParameterizedTest @ValueSource(ints = {1, 12, 48})
    void listAndBothDetailEndpointsExposeConfiguredDeadline(int hours) {
        when(settings.getInt(SystemSettingService.REFUND_WINDOW_HOURS, 24)).thenReturn(hours);
        assertThat(service.getMyBookingsList().getFirst().getRefundDeadline()).isEqualTo(paidAt.plusHours(hours));
        assertThat(service.getMyBookings(5L).getRefundDeadline()).isEqualTo(paidAt.plusHours(hours));
        assertThat(service.getBookingById(5L).getRefundDeadline()).isEqualTo(paidAt.plusHours(hours));
        when(settings.getInt(SystemSettingService.REFUND_WINDOW_HOURS, 24)).thenReturn(hours + 3);
        assertThat(service.getMyBookingsList().getFirst().getRefundDeadline()).isEqualTo(paidAt.plusHours(hours + 3));
    }

    @Test void checkedInOrUnpaidOrClosedBookingsHaveNoRefundDeadline() {
        when(settings.getInt(anyString(), anyInt())).thenReturn(48);
        booking.getTickets().add(Ticket.builder().checkedInAt(LocalDateTime.now()).build());
        assertThat(service.getMyBookings(5L).getRefundDeadline()).isNull();
        booking.getTickets().clear();
        booking.getPayment().setPaymentStatus(PaymentStatus.PENDING);
        assertThat(service.getMyBookings(5L).getRefundDeadline()).isNull();
        booking.getPayment().setPaymentStatus(PaymentStatus.PAID);
        booking.setStatus(BookingStatus.REFUNDED);
        assertThat(service.getMyBookings(5L).getRefundDeadline()).isNull();
    }

    @Test void deadlineAndRefundRequestUseSameConfiguredWindow() {
        when(settings.getInt(SystemSettingService.REFUND_WINDOW_HOURS, 24)).thenReturn(1);
        when(bookings.findByIdForUpdate(5L)).thenReturn(Optional.of(booking));
        assertThat(service.getMyBookings(5L).getRefundDeadline()).isBefore(LocalDateTime.now());
        assertThatThrownBy(() -> service.requestRefund(5L, "Changed plans")).isInstanceOf(AppException.class)
                .extracting("errorCode").isEqualTo(com.ltweb.backend.exception.ErrorCode.REFUND_WINDOW_EXPIRED);
        when(settings.getInt(SystemSettingService.REFUND_WINDOW_HOURS, 24)).thenReturn(48);
        ReflectionTestUtils.setField(service, "notificationService", mock(NotificationService.class));
        service.requestRefund(5L, "Changed plans");
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
    }
}
