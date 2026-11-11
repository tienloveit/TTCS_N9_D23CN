package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.event.BookingPaidEvent;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.TicketRepository;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class VnpayPaymentTest {
    @Mock VnpayProperties props;
    @Mock RestTemplate restTemplate;
    @Mock BookingRepository bookingRepository;
    @Mock TicketRepository ticketRepository;
    @Mock RedisTemplate<String, String> redisTemplate;
    @Mock SimpMessagingTemplate simpMessagingTemplate;
    @Mock ApplicationEventPublisher eventPublisher;
    @Spy @InjectMocks VnpayService service;

    @Test
    void successfulIpnUpdatesPaymentAndRepeatedIpnDoesNotPayAgain() {
        Booking booking = pendingBooking();
        var params = callback("00", "10000000");

        assertThat(service.processIpn(params)).containsEntry("RspCode", "00");
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.COMPLETED);
        assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(booking.getPayment().getPaymentMethod()).isEqualTo(PaymentMethod.VNPAY);
        assertThat(booking.getPayment().getProviderTxnId()).isEqualTo("VNP-TEST");
        var paidAt = booking.getPayment().getPaidAt();
        assertThat(paidAt).isNotNull();

        assertThat(service.processIpn(params)).containsEntry("RspCode", "02");
        assertThat(booking.getPayment().getPaidAt()).isEqualTo(paidAt);
        verify(bookingRepository, times(1)).save(booking);
        verify(eventPublisher, times(1)).publishEvent(org.mockito.ArgumentMatchers.any(BookingPaidEvent.class));
    }

    @Test
    void failedIpnCancelsPaymentWithoutRecordingPaidAt() {
        Booking booking = pendingBooking();

        assertThat(service.processIpn(callback("24", "10000000"))).containsEntry("RspCode", "00");

        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.CANCELLED);
        assertThat(booking.getPayment().getPaidAt()).isNull();
        verify(eventPublisher, never()).publishEvent(org.mockito.ArgumentMatchers.any(BookingPaidEvent.class));
    }

    @Test
    void incorrectAmountDoesNotChangePayment() {
        Booking booking = pendingBooking();

        assertThat(service.processIpn(callback("00", "100"))).containsEntry("RspCode", "04");

        assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        verify(bookingRepository, never()).save(booking);
    }

    private Booking pendingBooking() {
        Booking booking = Booking.builder().id(5L).bookingCode("BK-PAYMENT")
                .totalAmount(new BigDecimal("100000")).status(BookingStatus.PENDING).build();
        booking.getPayment().setAmount(new BigDecimal("100000"));
        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));
        // Signature verification is tested separately from payment persistence/state transitions.
        doReturn(Map.of("validSignature", true)).when(service).verifyCallback(anyMap());
        return booking;
    }

    private Map<String, String> callback(String responseCode, String amount) {
        return Map.of("vnp_TxnRef", "5", "vnp_Amount", amount,
                "vnp_ResponseCode", responseCode, "vnp_TransactionStatus", responseCode,
                "vnp_TransactionNo", "VNP-TEST");
    }
}
