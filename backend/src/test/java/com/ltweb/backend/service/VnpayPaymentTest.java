package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.dto.request.CreateVnpayRequest;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.ShowtimeStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.event.BookingPaidEvent;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.TicketRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
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
  @Mock FoodStockService foodStockService;
  VnpayService service;
  VnpayCallbackService callbacks;

  @org.junit.jupiter.api.BeforeEach
  void createService() {
    service =
        BackendServiceFixtures.vnpay(
            props,
            restTemplate,
            bookingRepository,
            mock(com.ltweb.backend.repository.UserRepository.class),
            mock(BookingRefundService.class));
    callbacks =
        spy(
            BackendServiceFixtures.vnpayCallbacks(
                props,
                bookingRepository,
                ticketRepository,
                redisTemplate,
                simpMessagingTemplate,
                eventPublisher,
                foodStockService));
  }

  @Test
  void successfulIpnUpdatesPaymentAndRepeatedIpnDoesNotPayAgain() {
    Booking booking = pendingBooking();
    var params = callback("00", "10000000");

    assertThat(callbacks.processIpn(params)).containsEntry("RspCode", "00");
    assertThat(booking.getStatus()).isEqualTo(BookingStatus.COMPLETED);
    assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    assertThat(booking.getPayment().getPaymentMethod()).isEqualTo(PaymentMethod.VNPAY);
    assertThat(booking.getPayment().getProviderTxnId()).isEqualTo("VNP-TEST");
    var paidAt = booking.getPayment().getPaidAt();
    assertThat(paidAt).isNotNull();

    assertThat(callbacks.processIpn(params)).containsEntry("RspCode", "02");
    assertThat(booking.getPayment().getPaidAt()).isEqualTo(paidAt);
    verify(bookingRepository, times(1)).save(booking);
    verify(eventPublisher, times(1))
        .publishEvent(org.mockito.ArgumentMatchers.any(BookingPaidEvent.class));
  }

  @Test
  void failedIpnCancelsPaymentWithoutRecordingPaidAt() {
    Booking booking = pendingBooking();

    assertThat(callbacks.processIpn(callback("24", "10000000"))).containsEntry("RspCode", "00");

    assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.CANCELLED);
    assertThat(booking.getPayment().getPaidAt()).isNull();
    verify(eventPublisher, never())
        .publishEvent(org.mockito.ArgumentMatchers.any(BookingPaidEvent.class));
  }

  @Test
  void incorrectAmountDoesNotChangePayment() {
    Booking booking = pendingBooking();

    assertThat(callbacks.processIpn(callback("00", "100"))).containsEntry("RspCode", "04");

    assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    verify(bookingRepository, never()).save(booking);
  }

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void returnRejectsWrongAmountLikeIpn() {
    Booking booking = pendingBooking();
    assertThat(callbacks.processReturnUrl(callback("00", "100")).getCode()).isNotEqualTo(200);
    assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    verify(bookingRepository, never()).save(booking);
  }

  @Test
  void callbacksNeverReviveRefundedBooking() {
    Booking booking = pendingBooking();
    for (BookingStatus status : List.of(BookingStatus.REFUNDED, BookingStatus.REFUND_REQUESTED)) {
      booking.setStatus(status);
      assertThat(callbacks.processIpn(callback("00", "10000000"))).containsEntry("RspCode", "02");
      assertThat(callbacks.processReturnUrl(callback("00", "10000000")).getCode())
          .isNotEqualTo(200);
      assertThat(booking.getStatus()).isEqualTo(status);
    }
    verify(bookingRepository, never()).save(booking);
  }

  @Test
  void successAfterExpiryStillIssuesTicketsWhileSeatsAreHeld() {
    Booking booking = pendingBooking();
    booking.setExpiresAt(LocalDateTime.now().minusSeconds(30));

    assertThat(callbacks.processIpn(callback("00", "10000000"))).containsEntry("RspCode", "00");

    assertThat(booking.getStatus()).isEqualTo(BookingStatus.COMPLETED);
    assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    assertThat(booking.getTickets().get(0).getTicketStatus()).isEqualTo(TicketStatus.BOOKED);
    verify(eventPublisher).publishEvent(org.mockito.ArgumentMatchers.any(BookingPaidEvent.class));
  }

  @Test
  void paymentForCancelledBookingIsQueuedForRefundWithoutIssuingTickets() {
    Booking booking = pendingBooking();
    // Job dọn dẹp đã hủy đơn và trả ghế trước khi IPN thành công tới.
    booking.setStatus(BookingStatus.CANCELLED);
    booking.getPayment().setPaymentStatus(PaymentStatus.CANCELLED);
    releaseTickets(booking);

    assertThat(callbacks.processIpn(callback("00", "10000000"))).containsEntry("RspCode", "00");

    assertLateRefundQueued(booking);
    verify(foodStockService, never()).release(booking);

    // VNPay gửi lại IPN hoặc khách mở trang kết quả: không ghi nhận lần nữa, không báo đã có vé.
    assertThat(callbacks.processIpn(callback("00", "10000000"))).containsEntry("RspCode", "02");
    var returned = callbacks.processReturnUrl(callback("00", "10000000"));
    assertThat(returned.getCode()).isNotEqualTo(200);
    assertThat(returned.getMessage()).isEqualTo(VnpayCallbackService.LATE_PAYMENT_MESSAGE);
    verify(bookingRepository, times(1)).save(booking);
  }

  @Test
  void paymentForExpiredUncleanedBookingReleasesResourcesAndQueuesRefund() {
    Booking booking = pendingBooking();
    booking.setExpiresAt(LocalDateTime.now().minusMinutes(1));
    // Ghế không còn giữ cho đơn (khóa Redis/DB đã mất) nhưng job chưa kịp hủy đơn.
    releaseTickets(booking);

    assertThat(callbacks.processIpn(callback("00", "10000000"))).containsEntry("RspCode", "00");

    assertLateRefundQueued(booking);
    verify(foodStockService).release(booking);
  }

  @Test
  void paymentForCancelledShowtimeIsQueuedForRefundEvenWhileSeatsAreHeld() {
    // Đơn tạo đúng lúc suất bị hủy nên còn PENDING và còn giữ ghế khi tiền về.
    Booking booking = pendingBooking();
    booking.getShowtime().setStatus(ShowtimeStatus.CANCELLED);

    assertThat(callbacks.processIpn(callback("00", "10000000"))).containsEntry("RspCode", "00");

    assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
    assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    assertThat(booking.getPayment().getRefundReason())
        .isEqualTo(VnpayCallbackService.SHOWTIME_CANCELLED_REFUND_REASON);
    assertThat(booking.getTickets().get(0).getTicketStatus()).isNotEqualTo(TicketStatus.BOOKED);
    verify(foodStockService).release(booking);
    verify(eventPublisher, never())
        .publishEvent(org.mockito.ArgumentMatchers.any(BookingPaidEvent.class));
    assertThat(callbacks.processReturnUrl(callback("00", "10000000")).getMessage())
        .isEqualTo(VnpayCallbackService.SHOWTIME_CANCELLED_MESSAGE);
  }

  @Test
  void paymentUrlIsRefusedForCancelledShowtime() {
    Booking booking = pendingBooking();
    booking.getShowtime().setStatus(ShowtimeStatus.CANCELLED);
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken("customer", "n/a", java.util.List.of()));
    CreateVnpayRequest request = new CreateVnpayRequest();
    request.setBookingId(5L);

    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> service.createPaymentUrl(request, new MockHttpServletRequest()))
        .isInstanceOf(com.ltweb.backend.exception.AppException.class)
        .extracting("errorCode")
        .isEqualTo(com.ltweb.backend.exception.ErrorCode.SHOWTIME_CANCELLED);
    assertThat(booking.getPayment().getPaymentMethod()).isNull();
  }

  @Test
  void failedCallbackAfterExpiryLeavesCleanupToTheJob() {
    Booking booking = pendingBooking();
    booking.setExpiresAt(LocalDateTime.now().minusSeconds(1));
    assertThat(callbacks.processIpn(callback("24", "10000000"))).containsEntry("RspCode", "02");
    assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING);
    verify(bookingRepository, never()).save(booking);
  }

  private void assertLateRefundQueued(Booking booking) {
    assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
    assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    assertThat(booking.getPayment().getPaymentMethod()).isEqualTo(PaymentMethod.VNPAY);
    assertThat(booking.getPayment().getProviderTxnId()).isEqualTo("VNP-TEST");
    assertThat(booking.getPayment().getRefundReason())
        .isEqualTo(VnpayCallbackService.LATE_PAYMENT_REFUND_REASON);
    assertThat(booking.getPayment().getRefundAmount()).isEqualByComparingTo("100000");
    assertThat(booking.getSpendingRecorded()).isFalse();
    verify(eventPublisher, never())
        .publishEvent(org.mockito.ArgumentMatchers.any(BookingPaidEvent.class));
  }

  private static void releaseTickets(Booking booking) {
    booking
        .getTickets()
        .forEach(
            ticket -> {
              ticket.setBooking(null);
              ticket.setTicketStatus(TicketStatus.AVAILABLE);
            });
  }

  @Test
  void returnThenIpnPaysExactlyOnce() {
    Booking booking = pendingBooking();
    assertThat(callbacks.processReturnUrl(callback("00", "10000000")).getCode()).isEqualTo(200);
    assertThat(callbacks.processIpn(callback("00", "10000000"))).containsEntry("RspCode", "02");
    verify(bookingRepository, times(1)).save(booking);
  }

  @Test
  void paymentUrlUsesDatabaseAmountAndBookingDeadline() {
    Booking booking = pendingBooking();
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken("customer", "n/a", java.util.List.of()));
    when(props.getSecretKey()).thenReturn("a".repeat(64));
    when(props.getPayUrl()).thenReturn("https://example.test/pay");
    when(props.getReturnUrl()).thenReturn("https://example.test/return");
    when(props.getTmnCode()).thenReturn("TEST");
    CreateVnpayRequest request = new CreateVnpayRequest();
    request.setBookingId(5L);
    request.setAmount(1L);
    String url =
        (String) service.createPaymentUrl(request, new MockHttpServletRequest()).get("paymentUrl");
    assertThat(url).contains("vnp_Amount=10000000");
    assertThat(url)
        .contains(
            "vnp_ExpireDate="
                + booking
                    .getExpiresAt()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
  }

  @Test
  void paymentUrlRejectsAnotherCustomer() {
    pendingBooking();
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken("other", "n/a", java.util.List.of()));
    CreateVnpayRequest request = new CreateVnpayRequest();
    request.setBookingId(5L);
    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> service.createPaymentUrl(request, new MockHttpServletRequest()))
        .isInstanceOf(com.ltweb.backend.exception.AppException.class)
        .extracting("errorCode")
        .isEqualTo(com.ltweb.backend.exception.ErrorCode.ACCESS_DENIED);
  }

  private Booking pendingBooking() {
    Booking booking =
        Booking.builder()
            .id(5L)
            .bookingCode("BK-PAYMENT")
            .totalAmount(new BigDecimal("100000"))
            .status(BookingStatus.PENDING)
            .expiresAt(LocalDateTime.now().plusMinutes(5))
            .showtime(Showtime.builder().id(3L).build())
            .user(User.builder().id(1L).username("customer").build())
            .build();
    booking
        .getTickets()
        .add(
            Ticket.builder()
                .id(10L)
                .booking(booking)
                .showtime(booking.getShowtime())
                .seat(Seat.builder().id(4L).seatCode("A1").build())
                .ticketStatus(TicketStatus.HOLDING)
                .build());
    booking.getPayment().setAmount(new BigDecimal("100000"));
    when(bookingRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(booking));
    // Signature verification is tested separately from payment persistence/state transitions.
    org.mockito.Mockito.lenient()
        .doReturn(Map.of("validSignature", true))
        .when(callbacks)
        .verifyCallback(anyMap());
    return booking;
  }

  private Map<String, String> callback(String responseCode, String amount) {
    return Map.of(
        "vnp_TxnRef",
        "5",
        "vnp_Amount",
        amount,
        "vnp_ResponseCode",
        responseCode,
        "vnp_TransactionStatus",
        responseCode,
        "vnp_TransactionNo",
        "VNP-TEST");
  }
}
