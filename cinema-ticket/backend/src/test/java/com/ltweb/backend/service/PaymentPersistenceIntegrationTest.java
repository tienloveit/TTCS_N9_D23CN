package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

// Run only against a disposable, migrated MySQL clone; never the live cinema database.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(named = "PAYMENT_TEST_DATABASE", matches = "cinema_payment_test_\\d{14}")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:mysql://127.0.0.1:3306/${PAYMENT_TEST_DATABASE}",
        "spring.datasource.username=${PAYMENT_TEST_USER}",
        "spring.datasource.password=${PAYMENT_TEST_PASSWORD}",
        "spring.jpa.hibernate.ddl-auto=validate"
})
class PaymentPersistenceIntegrationTest {
    @Autowired EntityManager entityManager;

    @Test
    void insertUpdateAndDeleteBookingCascadeToSeparatePayment() {
        Showtime showtime = entityManager.createQuery("select s from Showtime s", Showtime.class)
                .setMaxResults(1).getSingleResult();
        User processor = entityManager.createQuery("select u from User u", User.class)
                .setMaxResults(1).getSingleResult();
        Booking booking = Booking.builder()
                .bookingCode("PAYMENT-TEST-" + UUID.randomUUID())
                .showtime(showtime).totalAmount(new BigDecimal("120000"))
                .status(BookingStatus.PENDING).build();
        booking.getPayment().setPaymentMethod(PaymentMethod.CASH);
        booking.getPayment().setPaymentCreatedAt(LocalDateTime.now());

        entityManager.persist(booking);
        entityManager.flush();
        Long bookingId = booking.getId();
        entityManager.clear();

        booking = entityManager.find(Booking.class, bookingId);
        var payment = booking.getPayment();
        assertThat(payment.getId()).isNotNull();
        assertThat(payment.getBooking().getId()).isEqualTo(bookingId);
        assertThat(payment.getAmount()).isEqualByComparingTo("120000");
        assertThat(payment.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(payment.getCreatedAt()).isNotNull();
        assertThat(payment.getUpdatedAt()).isNotNull();

        booking.setStatus(BookingStatus.REFUNDED);
        payment.setPaymentStatus(PaymentStatus.REFUNDED);
        payment.setPaidAt(LocalDateTime.now().minusMinutes(10));
        payment.setRefundAmount(new BigDecimal("120000"));
        payment.setRefundProcessedBy(processor);
        payment.setRefundProcessNote("Integration refund");
        entityManager.flush();
        entityManager.clear();

        booking = entityManager.find(Booking.class, bookingId);
        assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
        assertThat(booking.getPayment().getRefundAmount()).isEqualByComparingTo("120000");
        assertThat(booking.getPayment().getRefundProcessedBy().getId()).isEqualTo(processor.getId());
        assertThat(booking.getPayment().getRefundProcessNote()).isEqualTo("Integration refund");

        entityManager.remove(booking);
        entityManager.flush();
        assertThat(((Number) entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM payments WHERE booking_id = :id")
                .setParameter("id", bookingId).getSingleResult()).intValue()).isZero();
    }
}
