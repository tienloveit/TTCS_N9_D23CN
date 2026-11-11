package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.dto.request.CreateVnpayRequest;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class BookingServicePaymentTest {
    @Mock BookingRepository bookingRepository;
    @Mock UserRepository userRepository;
    @Mock BookingMapper bookingMapper;
    @Mock VnpayProperties props;
    @InjectMocks BookingService bookingService;
    @InjectMocks VnpayService vnpayService;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "NEW-PROMO"})
    void issuedPaymentUrlPreventsRemovingOrReplacingPromotion(String promotionCode) {
        Booking booking = pendingDiscountedBooking();
        when(props.getSecretKey()).thenReturn("a".repeat(64));
        when(props.getPayUrl()).thenReturn("https://example.test/pay");
        when(props.getReturnUrl()).thenReturn("https://example.test/return");
        when(props.getTmnCode()).thenReturn("TEST");
        CreateVnpayRequest request = new CreateVnpayRequest();
        request.setBookingId(5L);
        String paymentUrl = (String) vnpayService.createPaymentUrl(request, new MockHttpServletRequest())
                .get("paymentUrl");

        assertThat(paymentUrl).contains("vnp_Amount=9000000");
        assertThat(booking.getPayment().getPaymentMethod()).isEqualTo(PaymentMethod.VNPAY);
        assertThatThrownBy(() -> bookingService.applyPromotion(5L, promotionCode))
                .isInstanceOf(AppException.class).extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_PAYMENT_STATUS);
        assertThat(booking.getTotalAmount()).isEqualByComparingTo("90000");
        assertThat(booking.getPayment().getAmount()).isEqualByComparingTo("90000");
        assertThat(booking.getPromotionCode()).isEqualTo("OLD-PROMO");
        assertThat(booking.getDiscountAmount()).isEqualByComparingTo("10000");
    }

    @Test
    void promotionCanStillBeRemovedBeforeIssuingPaymentUrl() {
        Booking booking = pendingDiscountedBooking();

        bookingService.applyPromotion(5L, "");

        assertThat(booking.getTotalAmount()).isEqualByComparingTo("100000");
        assertThat(booking.getPayment().getAmount()).isEqualByComparingTo("100000");
        assertThat(booking.getPromotionCode()).isNull();
        assertThat(booking.getDiscountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    private Booking pendingDiscountedBooking() {
        User user = User.builder().id(1L).username("customer").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("customer", "n/a"));
        when(userRepository.findByUsername("customer")).thenReturn(Optional.of(user));
        Booking booking = Booking.builder().id(5L).user(user).status(BookingStatus.PENDING)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .totalAmount(new BigDecimal("90000")).discountAmount(new BigDecimal("10000"))
                .promotionCode("OLD-PROMO").build();
        booking.getPayment().setAmount(booking.getTotalAmount());
        when(bookingRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(booking));
        return booking;
    }
}
