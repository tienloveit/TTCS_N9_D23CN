package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Payment;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.mapper.BookingMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class PaymentMappingTest {
  private final BookingMapper mapper = Mappers.getMapper(BookingMapper.class);

  @Test
  void bookingResponseKeepsPaymentAndRefundFieldsFromSeparateEntity() {
    LocalDateTime paid = LocalDateTime.of(2026, 11, 11, 10, 0);
    User staff = User.builder().id(7L).username("manager").build();
    Payment payment =
        Payment.builder()
            .paymentMethod(PaymentMethod.VNPAY)
            .paymentStatus(PaymentStatus.REFUNDED)
            .amount(new BigDecimal("120000"))
            .providerTxnId("VNP-123")
            .paymentCreatedAt(paid.minusMinutes(5))
            .paidAt(paid)
            .refundReason("Changed plans")
            .refundProcessNote("Approved")
            .refundProcessedBy(staff)
            .refundProcessedAt(paid.plusHours(1))
            .refundedAt(paid.plusHours(2))
            .refundAmount(new BigDecimal("120000"))
            .build();
    Booking booking = Booking.builder().id(5L).tickets(null).build();
    booking.setPayment(payment);

    var response = mapper.toBookingResponse(booking);

    assertThat(payment.getBooking()).isSameAs(booking);
    assertThat(response.getBookingId()).isEqualTo(5L);
    assertThat(response.getPaymentMethod()).isEqualTo(PaymentMethod.VNPAY);
    assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
    assertThat(response.getProviderTxnId()).isEqualTo("VNP-123");
    assertThat(response.getPaidAt()).isEqualTo(paid);
    assertThat(response.getPaymentCreatedAt()).isEqualTo(paid.minusMinutes(5));
    assertThat(response.getRefundReason()).isEqualTo("Changed plans");
    assertThat(response.getRefundProcessNote()).isEqualTo("Approved");
    assertThat(response.getRefundProcessedById()).isEqualTo(7L);
    assertThat(response.getRefundProcessedByUsername()).isEqualTo("manager");
    assertThat(response.getRefundProcessedAt()).isEqualTo(paid.plusHours(1));
    assertThat(response.getRefundedAt()).isEqualTo(paid.plusHours(2));
    assertThat(response.getRefundAmount()).isEqualByComparingTo("120000");
  }
}
