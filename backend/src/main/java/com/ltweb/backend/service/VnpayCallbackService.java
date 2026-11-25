package com.ltweb.backend.service;

import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.SeatStatusEvent;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Payment;
import com.ltweb.backend.entity.PaymentEvent;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.event.BookingPaidEvent;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.util.TicketQrCode;
import com.ltweb.backend.util.VnpayUtil;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Xử lý kết quả thanh toán VNPay gửi về: return URL (trình duyệt quay lại) và IPN (VNPay gọi
 * server). Mỗi callback được kiểm chữ ký, khớp đơn và số tiền, ghi vào nhật ký thanh toán, và
 * idempotent: payment đã PAID thì trả mã 02.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VnpayCallbackService {
  private final java.time.Clock clock;
  private final VnpayProperties props;
  private final BookingAccessPolicy bookingAccessPolicy;
  private final BookingRepository bookingRepository;
  private final TicketRepository ticketRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final SimpMessagingTemplate simpMessagingTemplate;
  private final ApplicationEventPublisher eventPublisher;
  private final BookingReleaseService bookingReleaseService;
  private final NotificationService notificationService;
  private final PaymentEventService paymentEventService;

  static final String LATE_PAYMENT_REFUND_REASON =
      "VNPay xác nhận thanh toán sau khi đơn đã hết hạn giữ ghế; cần hoàn tiền";
  static final String LATE_PAYMENT_MESSAGE =
      "Thanh toán đến sau khi đơn đã hết thời gian giữ ghế nên không xuất vé."
          + " Đơn đã được chuyển sang chờ hoàn tiền.";
  static final String SHOWTIME_CANCELLED_REFUND_REASON =
      "VNPay xác nhận thanh toán cho suất chiếu đã bị hủy; cần hoàn tiền";
  static final String SHOWTIME_CANCELLED_MESSAGE =
      "Suất chiếu đã bị hủy nên không xuất vé. Đơn đã được chuyển sang chờ hoàn tiền.";

  private static final Map<String, String> RESPONSE_CODE_DESC = createResponseCodeDesc();
  private static final Map<String, String> TRANSACTION_STATUS_DESC = createTransactionStatusDesc();

  public Map<String, Object> verifyCallback(Map<String, String> params) {
    String secureHash = params.get("vnp_SecureHash");

    Map<String, String> filtered = new HashMap<>();
    for (Map.Entry<String, String> entry : params.entrySet()) {
      String key = entry.getKey();
      if (!"vnp_SecureHash".equals(key) && !"vnp_SecureHashType".equals(key)) {
        filtered.put(key, entry.getValue());
      }
    }

    String hashData = VnpayUtil.buildReturnHashData(filtered);
    String calculatedHash = VnpayUtil.hmacSHA512(props.getSecretKey(), hashData);
    boolean valid = calculatedHash.equalsIgnoreCase(secureHash);

    Map<String, Object> result = new HashMap<>();
    result.put("validSignature", valid);
    result.put("vnp_TxnRef", params.get("vnp_TxnRef"));
    result.put("vnp_Amount", params.get("vnp_Amount"));
    result.put("vnp_OrderInfo", params.get("vnp_OrderInfo"));
    result.put("vnp_ResponseCode", params.get("vnp_ResponseCode"));
    result.put("vnp_TransactionStatus", params.get("vnp_TransactionStatus"));
    result.put("vnp_TransactionNo", params.get("vnp_TransactionNo"));
    result.put("vnp_BankCode", params.get("vnp_BankCode"));
    result.put("vnp_PayDate", params.get("vnp_PayDate"));
    return result;
  }

  @Transactional
  public ApiResponse<Map<String, Object>> processReturnUrl(Map<String, String> params) {
    Map<String, Object> verified = new HashMap<>(verifyCallback(params));
    if (!Boolean.TRUE.equals(verified.get("validSignature"))) {
      paymentEventService.recordCallback(
          PaymentEvent.Type.VNPAY_RETURN, null, params, false, "97", "Invalid Checksum");
      return ApiResponse.<Map<String, Object>>builder()
          .code(97)
          .message("Chữ ký không hợp lệ")
          .result(verified)
          .build();
    }
    Map<String, String> outcome = applyVerifiedCallback(PaymentEvent.Type.VNPAY_RETURN, params);
    boolean paid = "true".equals(outcome.get("paid"));
    verified.put("paymentApplied", paid);
    verified.put(
        "vnp_ResponseCodeDesc",
        RESPONSE_CODE_DESC.getOrDefault(params.get("vnp_ResponseCode"), "Lỗi khác"));
    verified.put(
        "vnp_TransactionStatusDesc",
        TRANSACTION_STATUS_DESC.getOrDefault(
            params.get("vnp_TransactionStatus"), "Không xác định"));
    return ApiResponse.<Map<String, Object>>builder()
        .code(paid ? 200 : 99)
        .message(
            paid
                ? "Thanh toán đã được ghi nhận"
                : outcome.getOrDefault("userMessage", outcome.get("Message")))
        .result(verified)
        .build();
  }

  @Transactional
  public Map<String, String> processIpn(Map<String, String> params) {
    if (!Boolean.TRUE.equals(verifyCallback(params).get("validSignature"))) {
      paymentEventService.recordCallback(
          PaymentEvent.Type.VNPAY_IPN, null, params, false, "97", "Invalid Checksum");
      return rsp("97", "Invalid Checksum");
    }
    Map<String, String> outcome = applyVerifiedCallback(PaymentEvent.Type.VNPAY_IPN, params);
    return rsp(outcome.get("RspCode"), outcome.get("Message"));
  }

  /** Áp dụng callback đã xác thực chữ ký và ghi lại vào nhật ký thanh toán. */
  private Map<String, String> applyVerifiedCallback(
      PaymentEvent.Type type, Map<String, String> params) {
    AtomicReference<Long> bookingId = new AtomicReference<>();
    Map<String, String> outcome = applyCallback(params, bookingId);
    paymentEventService.recordCallback(
        type,
        bookingId.get(),
        params,
        true,
        outcome.get("RspCode"),
        outcome.getOrDefault("userMessage", outcome.get("Message")));
    return outcome;
  }

  private Map<String, String> applyCallback(
      Map<String, String> params, AtomicReference<Long> matchedBooking) {
    String txnRef = params.get("vnp_TxnRef");
    if (txnRef == null || txnRef.isBlank()) return rsp("01", "Order not Found");
    Booking booking = VnpayBookings.findByTxnRef(bookingRepository, txnRef).orElse(null);
    if (booking == null || booking.getPayment() == null) return rsp("01", "Order not Found");
    matchedBooking.set(booking.getId());
    String expected =
        booking.getPayment().getAmount().movePointRight(2).toBigIntegerExact().toString();
    if (!expected.equals(params.get("vnp_Amount"))) return rsp("04", "Invalid Amount");

    boolean success =
        "00".equals(params.get("vnp_ResponseCode"))
            && "00".equals(params.get("vnp_TransactionStatus"));
    if (booking.getPayment().getPaymentStatus() == PaymentStatus.PAID) {
      // Callback lặp lại (IPN và return URL, hoặc VNPay gửi lại): kết quả đã được ghi nhận.
      Map<String, String> result = rsp("02", "Order already confirmed");
      result.put("paid", String.valueOf(success && ticketsIssued(booking)));
      if (!ticketsIssued(booking)) result.put("userMessage", latePaymentMessage(booking));
      return result;
    }

    boolean awaitingPayment =
        booking.getStatus() == BookingStatus.PENDING
            && booking.getPayment().getPaymentStatus() == PaymentStatus.PENDING;
    boolean seatsHeld = seatsHeldBy(booking);

    if (success) {
      // VNPay chỉ cho trả trước vnp_ExpireDate, nhưng IPN có thể tới sau expiresAt. Nếu ghế vẫn
      // còn giữ cho đơn thì vẫn xuất vé; nếu không, tiền đã bị trừ nên phải ghi nhận để hoàn.
      // Suất đã bị hủy thì không xuất vé dù ghế còn giữ (đơn tạo đúng lúc suất bị hủy).
      if (awaitingPayment && seatsHeld && !VnpayBookings.isShowtimeCancelled(booking)) {
        return confirmPaid(booking, params);
      }
      if (!isReleasedOrUnpaid(booking)) {
        // Trạng thái không nhất quán (ví dụ REFUNDED mà payment chưa PAID): không ghi đè.
        return rsp("02", "Order is no longer payable");
      }
      return recordLatePayment(booking, params);
    }

    if (!VnpayBookings.isPendingPayment(booking, LocalDateTime.now(clock)) || !seatsHeld) {
      // Thất bại sau khi đơn đã hết hạn/hủy: job dọn dẹp hoặc lệnh hủy đã trả tài nguyên.
      return rsp("02", "Order is no longer payable");
    }
    booking.getPayment().setPaymentMethod(PaymentMethod.VNPAY);
    booking.getPayment().setPaymentStatus(PaymentStatus.CANCELLED);
    booking.setStatus(BookingStatus.CANCELLED);
    bookingReleaseService.releaseUnpaid(booking);
    bookingRepository.save(booking);
    Map<String, String> result = rsp("00", "Confirm Success");
    result.put("paid", "false");
    return result;
  }

  private Map<String, String> confirmPaid(Booking booking, Map<String, String> params) {
    booking.getPayment().setProviderTxnId(params.get("vnp_TransactionNo"));
    booking.getPayment().setPaymentMethod(PaymentMethod.VNPAY);
    booking.getPayment().setPaymentStatus(PaymentStatus.PAID);
    booking.getPayment().setPaidAt(LocalDateTime.now(clock));
    booking.setStatus(BookingStatus.COMPLETED);
    Long showtimeId = booking.getShowtime().getId();
    for (Ticket ticket : booking.getTickets()) {
      ticket.setTicketStatus(TicketStatus.BOOKED);
      ticket.setQrCode(TicketQrCode.of(booking, ticket));
      ticketRepository.save(ticket);
      Long seatId = ticket.getSeat().getId();
      BookingTransactionEffects.afterCommit(
          () ->
              simpMessagingTemplate.convertAndSend(
                  "/topic/showtime/" + showtimeId + "/seats",
                  SeatStatusEvent.builder().seatId(seatId).status("BOOKED").build()));
    }
    BookingTransactionEffects.releaseAfterCommit(
        redisTemplate, showtimeId, booking.getTickets(), booking.getBookingCode());
    bookingRepository.save(booking);
    eventPublisher.publishEvent(new BookingPaidEvent(booking.getId()));
    Map<String, String> result = rsp("00", "Confirm Success");
    result.put("paid", "true");
    return result;
  }

  /**
   * Tiền đã bị trừ nhưng đơn không còn ghế (đã hủy/hết hạn). Không xuất vé: ghi nhận giao dịch, đưa
   * đơn vào hàng chờ hoàn tiền sẵn có và báo quản lý. Trả RspCode 00 để VNPay biết đơn đã được ghi
   * nhận; nếu trả mã lỗi, khoản thanh toán sẽ không còn dấu vết nào trong hệ thống.
   */
  private Map<String, String> recordLatePayment(Booking booking, Map<String, String> params) {
    if (booking.getStatus() == BookingStatus.PENDING) {
      // Đơn chưa được dọn (không còn giữ ghế, hoặc suất đã bị hủy): trả tài nguyên trước khi chờ
      // hoàn.
      bookingReleaseService.releaseUnpaid(booking);
    }
    Payment payment = booking.getPayment();
    payment.setProviderTxnId(params.get("vnp_TransactionNo"));
    payment.setPaymentMethod(PaymentMethod.VNPAY);
    payment.setPaymentStatus(PaymentStatus.PAID);
    payment.setPaidAt(LocalDateTime.now(clock));
    payment.setRefundReason(
        VnpayBookings.isShowtimeCancelled(booking)
            ? SHOWTIME_CANCELLED_REFUND_REASON
            : LATE_PAYMENT_REFUND_REASON);
    payment.setRefundAmount(payment.getAmount());
    booking.setStatus(BookingStatus.REFUND_REQUESTED);
    booking.setSpendingRecorded(false);
    bookingRepository.save(booking);
    notificationService.notifyRefundRequest(
        bookingAccessPolicy.branchId(booking), booking.getId(), booking.getBookingCode());
    log.warn(
        "VNPay payment {} arrived after booking {} was released; queued for refund",
        params.get("vnp_TransactionNo"),
        booking.getBookingCode());
    Map<String, String> result = rsp("00", "Confirm Success");
    result.put("paid", "false");
    result.put("userMessage", latePaymentMessage(booking));
    return result;
  }

  private static String latePaymentMessage(Booking booking) {
    return VnpayBookings.isShowtimeCancelled(booking)
        ? SHOWTIME_CANCELLED_MESSAGE
        : LATE_PAYMENT_MESSAGE;
  }

  private static boolean seatsHeldBy(Booking booking) {
    return !booking.getTickets().isEmpty()
        && booking.getTickets().stream()
            .allMatch(
                ticket ->
                    ticket.getTicketStatus() == TicketStatus.HOLDING
                        && ticket.getBooking() != null
                        && booking.getId().equals(ticket.getBooking().getId()));
  }

  private static boolean isReleasedOrUnpaid(Booking booking) {
    return booking.getStatus() == BookingStatus.PENDING
        || booking.getStatus() == BookingStatus.CANCELLED
        || booking.getStatus() == BookingStatus.EXPIRED;
  }

  private static boolean ticketsIssued(Booking booking) {
    return !Boolean.FALSE.equals(booking.getSpendingRecorded())
        && booking.getStatus() != BookingStatus.REFUNDED
        && !booking.getTickets().isEmpty();
  }

  private Map<String, String> rsp(String code, String message) {
    Map<String, String> m = new HashMap<>();
    m.put("RspCode", code);
    m.put("Message", message);
    return m;
  }

  private static Map<String, String> createTransactionStatusDesc() {
    Map<String, String> map = new HashMap<>();
    map.put("00", "Giao dịch thành công");
    map.put("01", "Giao dịch chưa hoàn tất");
    map.put("02", "Giao dịch bị lỗi");
    map.put("04", "Giao dịch đảo");
    map.put("05", "VNPAY đang xử lý giao dịch này");
    map.put("06", "VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng");
    map.put("07", "Giao dịch bị nghi ngờ gian lận");
    map.put("09", "GD Hoàn trả bị từ chối");
    return map;
  }

  private static Map<String, String> createResponseCodeDesc() {
    Map<String, String> map = new HashMap<>();
    map.put("00", "Giao dịch thành công");
    map.put("07", "Trừ tiền thành công. Giao dịch bị nghi ngờ");
    map.put("09", "Thẻ/Tài khoản chưa đăng ký InternetBanking");
    map.put("10", "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần");
    map.put("11", "Đã hết hạn chờ thanh toán");
    map.put("12", "Thẻ/Tài khoản bị khóa");
    map.put("13", "Nhập sai OTP");
    map.put("24", "Khách hàng hủy giao dịch");
    map.put("51", "Tài khoản không đủ số dư");
    map.put("65", "Tài khoản vượt quá hạn mức giao dịch trong ngày");
    map.put("75", "Ngân hàng thanh toán đang bảo trì");
    map.put("79", "Nhập sai mật khẩu thanh toán quá số lần quy định");
    map.put("99", "Lỗi khác");
    return map;
  }
}
