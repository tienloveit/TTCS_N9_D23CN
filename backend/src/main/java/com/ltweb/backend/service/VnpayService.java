package com.ltweb.backend.service;

import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.dto.request.CreateVnpayRequest;
import com.ltweb.backend.dto.request.QueryRequest;
import com.ltweb.backend.dto.request.RefundRequest;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.util.VnpayUtil;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

/**
 * Gọi VNPay từ phía merchant: tạo URL thanh toán, truy vấn giao dịch và hoàn tiền trực tiếp. Kết
 * quả thanh toán VNPay gửi về do {@link VnpayCallbackService} xử lý.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VnpayService {
  private final CurrentUserProvider currentUserProvider;
  private final BookingAccessPolicy bookingAccessPolicy;
  private final java.time.Clock clock;

  private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter VNPAY_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

  private final VnpayProperties props;
  private final RestTemplate restTemplate;
  private final BookingRepository bookingRepository;
  private final BookingRefundService bookingRefundService;

  @Transactional
  public Map<String, Object> createPaymentUrl(CreateVnpayRequest req, HttpServletRequest request) {
    String vnpVersion = "2.1.0";
    String vnpCommand = "pay";
    String orderType =
        (req.getOrderType() == null || req.getOrderType().isBlank()) ? "other" : req.getOrderType();
    String requestedRef =
        req.getBookingId() == null ? req.getOrderId() : String.valueOf(req.getBookingId());
    if (requestedRef == null || requestedRef.isBlank()) {
      throw new AppException(ErrorCode.BOOKING_NOT_FOUND);
    }
    Booking booking =
        VnpayBookings.findByTxnRef(bookingRepository, requestedRef)
            .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
    var auth = SecurityContextHolder.getContext().getAuthentication();
    boolean owner =
        auth != null
            && booking.getUser() != null
            && auth.getName().equals(booking.getUser().getUsername());
    boolean seller =
        auth != null
            && booking.getStaffUser() != null
            && auth.getName().equals(booking.getStaffUser().getUsername());
    boolean admin =
        auth != null
            && auth.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    if (!owner && !seller && !admin) throw new AppException(ErrorCode.ACCESS_DENIED);
    if (VnpayBookings.isShowtimeCancelled(booking))
      throw new AppException(ErrorCode.SHOWTIME_CANCELLED);
    if (!VnpayBookings.isPendingPayment(booking, LocalDateTime.now(clock)))
      throw new AppException(ErrorCode.INVALID_PAYMENT_STATUS);
    String txnRef = String.valueOf(booking.getId());
    booking.getPayment().setPaymentMethod(PaymentMethod.VNPAY);
    if (booking.getPayment().getPaymentCreatedAt() == null) {
      booking.getPayment().setPaymentCreatedAt(LocalDateTime.now(clock));
    }
    bookingRepository.save(booking);
    String ipAddr = VnpayUtil.getClientIp(request);

    Map<String, String> params = new HashMap<>();
    params.put("vnp_Version", vnpVersion);
    params.put("vnp_Command", vnpCommand);
    params.put("vnp_TmnCode", props.getTmnCode());
    params.put(
        "vnp_Amount",
        booking.getPayment().getAmount().movePointRight(2).toBigIntegerExact().toString());
    params.put("vnp_CurrCode", "VND");

    if (req.getBankCode() != null && !req.getBankCode().isBlank()) {
      params.put("vnp_BankCode", req.getBankCode());
    }

    params.put("vnp_TxnRef", txnRef);
    params.put(
        "vnp_OrderInfo",
        (req.getOrderInfo() == null || req.getOrderInfo().isBlank())
            ? "Thanh toán đơn hàng:" + txnRef
            : req.getOrderInfo());
    params.put("vnp_OrderType", orderType);
    params.put(
        "vnp_Locale",
        (req.getLanguage() == null || req.getLanguage().isBlank()) ? "vn" : req.getLanguage());
    params.put("vnp_ReturnUrl", props.getReturnUrl());
    params.put("vnp_IpAddr", ipAddr);

    // Query/refund must reuse the exact merchant timestamp sent with the payment URL.
    params.put(
        "vnp_CreateDate", booking.getPayment().getPaymentCreatedAt().format(VNPAY_TIME_FORMATTER));
    params.put(
        "vnp_ExpireDate", booking.getExpiresAt().atZone(VN_ZONE).format(VNPAY_TIME_FORMATTER));

    List<String> fieldNames = new ArrayList<>(params.keySet());
    Collections.sort(fieldNames);

    StringBuilder hashData = new StringBuilder();
    StringBuilder query = new StringBuilder();

    Iterator<String> itr = fieldNames.iterator();
    while (itr.hasNext()) {
      String fieldName = itr.next();
      String fieldValue = params.get(fieldName);
      if (fieldValue != null && !fieldValue.isEmpty()) {
        hashData.append(fieldName).append("=").append(VnpayUtil.encode(fieldValue));
        query.append(VnpayUtil.encode(fieldName)).append("=").append(VnpayUtil.encode(fieldValue));
        if (itr.hasNext()) {
          hashData.append("&");
          query.append("&");
        }
      }
    }

    String secureHash = VnpayUtil.hmacSHA512(props.getSecretKey(), hashData.toString());
    String paymentUrl = props.getPayUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;

    Map<String, Object> result = new HashMap<>();
    result.put("paymentUrl", paymentUrl);
    result.put("txnRef", txnRef);
    return result;
  }

  @Transactional
  public String queryDr(QueryRequest req, HttpServletRequest servletRequest) {
    User operator = requirePaymentOperator();
    Booking booking = requireManagedVnpayBooking(req.getOrderId(), operator);
    String txnRef = String.valueOf(booking.getId());
    String transactionDate =
        booking.getPayment().getPaymentCreatedAt().format(VNPAY_TIME_FORMATTER);
    String requestId = VnpayUtil.randomNumeric(8);
    String version = "2.1.0";
    String command = "querydr";
    String tmnCode = props.getTmnCode();
    String orderInfo = "Kiểm tra kết quả GD OrderId:" + txnRef;
    String ipAddr = VnpayUtil.getClientIp(servletRequest);

    String createDate = ZonedDateTime.now(clock).format(VNPAY_TIME_FORMATTER);

    String hashData =
        String.join(
            "|",
            requestId,
            version,
            command,
            tmnCode,
            txnRef,
            transactionDate,
            createDate,
            ipAddr,
            orderInfo);

    String secureHash = VnpayUtil.hmacSHA512(props.getSecretKey(), hashData);

    Map<String, String> payload = new LinkedHashMap<>();
    payload.put("vnp_RequestId", requestId);
    payload.put("vnp_Version", version);
    payload.put("vnp_Command", command);
    payload.put("vnp_TmnCode", tmnCode);
    payload.put("vnp_TxnRef", txnRef);
    payload.put("vnp_OrderInfo", orderInfo);
    payload.put("vnp_TransactionDate", transactionDate);
    payload.put("vnp_CreateDate", createDate);
    payload.put("vnp_IpAddr", ipAddr);
    payload.put("vnp_SecureHash", secureHash);

    return postJson(payload);
  }

  public String refund(RefundRequest req, HttpServletRequest servletRequest) {
    return bookingRefundService
        .processDirectRefund(req, servletRequest.getRemoteAddr())
        .getStatus()
        .name();
  }

  private User requirePaymentOperator() {
    User user = currentUserProvider.requireUser(ErrorCode.ACCESS_DENIED);
    bookingAccessPolicy.requireRefundOperator(user, true);
    return user;
  }

  private Booking requireManagedVnpayBooking(String orderId, User operator) {
    if (orderId == null || orderId.isBlank()) {
      throw new AppException(ErrorCode.BOOKING_NOT_FOUND);
    }
    Booking booking =
        VnpayBookings.findByTxnRef(bookingRepository, orderId)
            .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
    bookingAccessPolicy.requireCanRefund(booking, operator);
    if (booking.getPayment() == null
        || booking.getPayment().getPaymentMethod() != PaymentMethod.VNPAY
        || booking.getPayment().getPaymentCreatedAt() == null) {
      throw new AppException(ErrorCode.INVALID_PAYMENT_STATUS);
    }
    return booking;
  }

  private String postJson(Map<String, String> payload) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    HttpEntity<Map<String, String>> entity = new HttpEntity<>(payload, headers);
    ResponseEntity<String> response =
        restTemplate.postForEntity(props.getApiUrl(), entity, String.class);
    return response.getBody();
  }
}
