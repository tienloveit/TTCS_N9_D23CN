package com.ltweb.backend.service;

import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.dto.request.CreateVnpayRequest;
import com.ltweb.backend.dto.request.QueryRequest;
import com.ltweb.backend.dto.request.RefundRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.SeatStatusEvent;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.event.BookingPaidEvent;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.TicketRepository;
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
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class VnpayService {

  private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter VNPAY_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

  private final VnpayProperties props;
  private final RestTemplate restTemplate;
  private final BookingRepository bookingRepository;
  private final TicketRepository ticketRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final SimpMessagingTemplate simpMessagingTemplate;
  private final ApplicationEventPublisher eventPublisher;

  private static final Map<String, String> RESPONSE_CODE_DESC = createResponseCodeDesc();
  private static final Map<String, String> TRANSACTION_STATUS_DESC = createTransactionStatusDesc();

  public Map<String, Object> createPaymentUrl(CreateVnpayRequest req, HttpServletRequest request) {
    String vnpVersion = "2.1.0";
    String vnpCommand = "pay";
    String orderType =
        (req.getOrderType() == null || req.getOrderType().isBlank()) ? "other" : req.getOrderType();
    String txnRef = req.getBookingId() == null ? null : String.valueOf(req.getBookingId());
    if (txnRef == null || txnRef.isBlank()) {
      txnRef =
          (req.getOrderId() == null || req.getOrderId().isBlank())
              ? VnpayUtil.randomNumeric(8)
              : req.getOrderId();
    }
    String ipAddr = VnpayUtil.getClientIp(request);

    Map<String, String> params = new HashMap<>();
    params.put("vnp_Version", vnpVersion);
    params.put("vnp_Command", vnpCommand);
    params.put("vnp_TmnCode", props.getTmnCode());
    params.put("vnp_Amount", String.valueOf(req.getAmount() * 100));
    params.put("vnp_CurrCode", "VND");

    if (req.getBankCode() != null && !req.getBankCode().isBlank()) {
      params.put("vnp_BankCode", req.getBankCode());
    }

    params.put("vnp_TxnRef", txnRef);
    params.put(
        "vnp_OrderInfo",
        (req.getOrderInfo() == null || req.getOrderInfo().isBlank())
            ? "Thanh toan don hang:" + txnRef
            : req.getOrderInfo());
    params.put("vnp_OrderType", orderType);
    params.put(
        "vnp_Locale",
        (req.getLanguage() == null || req.getLanguage().isBlank()) ? "vn" : req.getLanguage());
    params.put("vnp_ReturnUrl", props.getReturnUrl());
    params.put("vnp_IpAddr", ipAddr);

    ZonedDateTime now = ZonedDateTime.now(VN_ZONE);
    params.put("vnp_CreateDate", now.format(VNPAY_TIME_FORMATTER));
    params.put("vnp_ExpireDate", now.plusMinutes(6).format(VNPAY_TIME_FORMATTER));

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

  public String queryDr(QueryRequest req, HttpServletRequest servletRequest) {
    String requestId = VnpayUtil.randomNumeric(8);
    String version = "2.1.0";
    String command = "querydr";
    String tmnCode = props.getTmnCode();
    String orderInfo = "Kiem tra ket qua GD OrderId:" + req.getOrderId();
    String ipAddr = VnpayUtil.getClientIp(servletRequest);

    String createDate = ZonedDateTime.now(VN_ZONE).format(VNPAY_TIME_FORMATTER);

    String hashData =
        String.join(
            "|",
            requestId,
            version,
            command,
            tmnCode,
            req.getOrderId(),
            req.getTransDate(),
            createDate,
            ipAddr,
            orderInfo);

    String secureHash = VnpayUtil.hmacSHA512(props.getSecretKey(), hashData);

    Map<String, String> payload = new LinkedHashMap<>();
    payload.put("vnp_RequestId", requestId);
    payload.put("vnp_Version", version);
    payload.put("vnp_Command", command);
    payload.put("vnp_TmnCode", tmnCode);
    payload.put("vnp_TxnRef", req.getOrderId());
    payload.put("vnp_OrderInfo", orderInfo);
    payload.put("vnp_TransactionDate", req.getTransDate());
    payload.put("vnp_CreateDate", createDate);
    payload.put("vnp_IpAddr", ipAddr);
    payload.put("vnp_SecureHash", secureHash);

    return postJson(payload);
  }

  public String refund(RefundRequest req, HttpServletRequest servletRequest) {
    String requestId = VnpayUtil.randomNumeric(8);
    String version = "2.1.0";
    String command = "refund";
    String tmnCode = props.getTmnCode();
    String transactionNo = "";
    String amount = String.valueOf(req.getAmount() * 100);
    String orderInfo = "Hoan tien GD OrderId:" + req.getOrderId();
    String ipAddr = VnpayUtil.getClientIp(servletRequest);

    String createDate = ZonedDateTime.now(VN_ZONE).format(VNPAY_TIME_FORMATTER);

    String hashData =
        String.join(
            "|",
            requestId,
            version,
            command,
            tmnCode,
            req.getTrantype(),
            req.getOrderId(),
            amount,
            transactionNo,
            req.getTransDate(),
            req.getUser(),
            createDate,
            ipAddr,
            orderInfo);

    String secureHash = VnpayUtil.hmacSHA512(props.getSecretKey(), hashData);

    Map<String, String> payload = new LinkedHashMap<>();
    payload.put("vnp_RequestId", requestId);
    payload.put("vnp_Version", version);
    payload.put("vnp_Command", command);
    payload.put("vnp_TmnCode", tmnCode);
    payload.put("vnp_TransactionType", req.getTrantype());
    payload.put("vnp_TxnRef", req.getOrderId());
    payload.put("vnp_Amount", amount);
    payload.put("vnp_OrderInfo", orderInfo);
    payload.put("vnp_TransactionDate", req.getTransDate());
    payload.put("vnp_CreateBy", req.getUser());
    payload.put("vnp_CreateDate", createDate);
    payload.put("vnp_IpAddr", ipAddr);
    payload.put("vnp_SecureHash", secureHash);

    return postJson(payload);
  }

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
    Map<String, Object> verify = verifyCallback(params);
    boolean validSignature = Boolean.TRUE.equals(verify.get("validSignature"));

    if (!validSignature) {
      return ApiResponse.<Map<String, Object>>builder()
          .code(97)
          .message("Chu ky khong hop le")
          .result(verify)
          .build();
    }

    String responseCode = String.valueOf(verify.getOrDefault("vnp_ResponseCode", ""));
    String transactionStatus = String.valueOf(verify.getOrDefault("vnp_TransactionStatus", ""));

    verify.put("vnp_ResponseCodeDesc", RESPONSE_CODE_DESC.getOrDefault(responseCode, "Loi khac"));
    verify.put(
        "vnp_TransactionStatusDesc",
        TRANSACTION_STATUS_DESC.getOrDefault(transactionStatus, "Khong xac dinh"));

    boolean success = "00".equals(responseCode) && "00".equals(transactionStatus);

    // Cập nhật DB ngay tại đây (idempotent - an toàn khi IPN cũng gọi ở Production)
    String txnRef = params.get("vnp_TxnRef");
    if (txnRef != null && !txnRef.isBlank()) {
      Optional<Booking> bookingOpt = findBookingByTxnRef(txnRef);

      bookingOpt.ifPresent(
          booking -> {
            // Idempotency: chỉ xử lý nếu booking chưa được cập nhật
            if (booking.getStatus() != BookingStatus.COMPLETED
                && booking.getStatus() != BookingStatus.CANCELLED) {
              booking.setPaymentMethod(PaymentMethod.VNPAY);
              booking.setProviderTxnId(params.get("vnp_TransactionNo"));

              if (success) {
                booking.setStatus(BookingStatus.COMPLETED);
                booking.setPaymentStatus(PaymentStatus.PAID);
                booking.setPaidAt(LocalDateTime.now());

                booking
                    .getTickets()
                    .forEach(
                        ticket -> {
                          ticket.setTicketStatus(TicketStatus.BOOKED);
                          ticket.setQrCode(getOrCreateTicketQrCode(booking, ticket));
                          ticketRepository.save(ticket);
                          simpMessagingTemplate.convertAndSend(
                              "/topic/showtime/" + ticket.getShowtime().getId() + "/seats",
                              SeatStatusEvent.builder()
                                  .seatId(ticket.getSeat().getId())
                                  .status("BOOKED")
                                  .build());
                        });
              } else {
                booking.setStatus(BookingStatus.CANCELLED);
                booking.setPaymentStatus(PaymentStatus.CANCELLED);

                booking
                    .getTickets()
                    .forEach(
                        ticket -> {
                          ticket.setBooking(null);
                          ticket.setTicketStatus(TicketStatus.AVAILABLE);
                          ticketRepository.save(ticket);
                          simpMessagingTemplate.convertAndSend(
                              "/topic/showtime/" + ticket.getShowtime().getId() + "/seats",
                              SeatStatusEvent.builder()
                                  .seatId(ticket.getSeat().getId())
                                  .status("AVAILABLE")
                                  .build());
                        });
              }

              bookingRepository.save(booking);
              if (success) {
                eventPublisher.publishEvent(new BookingPaidEvent(booking.getId()));
              }

              // Xóa Redis seat lock
              try {
                List<String> keys =
                    booking.getTickets().stream()
                        .map(
                            t ->
                                "seat_hold:"
                                    + booking.getShowtime().getId()
                                    + ":"
                                    + t.getSeat().getId())
                        .toList();
                redisTemplate.delete(keys);
              } catch (Exception ex) {
                log.warn("Không thể xóa Redis seat lock: {}", ex.getMessage());
              }
            }
          });
    }

    if (success) {
      return ApiResponse.<Map<String, Object>>builder()
          .code(200)
          .message("GD Thanh cong")
          .result(verify)
          .build();
    }

    return ApiResponse.<Map<String, Object>>builder()
        .code(99)
        .message("GD Khong thanh cong")
        .result(verify)
        .build();
  }

  @Transactional
  public Map<String, String> processIpn(Map<String, String> params) {
    try {
      Map<String, Object> verify = verifyCallback(params);
      boolean validSignature = Boolean.TRUE.equals(verify.get("validSignature"));
      if (!validSignature) {
        return rsp("97", "Invalid Checksum");
      }

      String txnRef = params.get("vnp_TxnRef");
      if (txnRef == null || txnRef.isBlank()) {
        return rsp("01", "Order not Found");
      }

      Optional<Booking> bookingOpt = findBookingByTxnRef(txnRef);

      if (bookingOpt.isEmpty()) {
        return rsp("01", "Order not Found");
      }

      Booking booking = bookingOpt.get();
      String vnpAmount = params.get("vnp_Amount");
      long expectedAmount = booking.getTotalAmount().movePointRight(2).longValue();
      if (vnpAmount == null || !String.valueOf(expectedAmount).equals(vnpAmount)) {
        return rsp("04", "Invalid Amount");
      }

      if (booking.getStatus() == BookingStatus.COMPLETED
          || booking.getPaymentStatus() == PaymentStatus.PAID) {
        return rsp("02", "Order already completed");
      }

      boolean paymentSuccess =
          "00".equals(params.get("vnp_ResponseCode"))
              && "00".equals(params.get("vnp_TransactionStatus"));

      booking.setProviderTxnId(params.get("vnp_TransactionNo"));
      booking.setPaymentStatus(paymentSuccess ? PaymentStatus.PAID : PaymentStatus.CANCELLED);
      if (paymentSuccess) {
        booking.setPaidAt(LocalDateTime.now());
      }

      booking.setPaymentMethod(PaymentMethod.VNPAY);
      if (paymentSuccess) {
        booking.setStatus(BookingStatus.COMPLETED);

        // Xoá Redis keys khi thanh toán thành công
        try {
          List<String> keysToDelete =
              booking.getTickets().stream()
                  .map(
                      ticket ->
                          "seat_hold:"
                              + booking.getShowtime().getId()
                              + ":"
                              + ticket.getSeat().getId())
                  .toList();
          redisTemplate.delete(keysToDelete);
          log.info("Xoá {} Redis keys khi thanh toán thành công", keysToDelete.size());
        } catch (Exception ex) {
          log.error("Lỗi khi xoá Redis keys: {}", ex.getMessage());
        }

        booking
            .getTickets()
            .forEach(
                ticket -> {
                  ticket.setTicketStatus(TicketStatus.BOOKED);
                  ticket.setQrCode(getOrCreateTicketQrCode(booking, ticket));
                  ticketRepository.save(ticket);
                  simpMessagingTemplate.convertAndSend(
                      "/topic/showtime/" + ticket.getShowtime().getId() + "/seats",
                      SeatStatusEvent.builder()
                          .seatId(ticket.getSeat().getId())
                          .status("BOOKED")
                          .build());
                });
      } else {
        booking.setStatus(BookingStatus.CANCELLED);

        // Xoá Redis keys hold vé khi thanh toán thất bại
        try {
          List<String> keysToDelete =
              booking.getTickets().stream()
                  .map(
                      ticket ->
                          "seat_hold:"
                              + booking.getShowtime().getId()
                              + ":"
                              + ticket.getSeat().getId())
                  .toList();
          redisTemplate.delete(keysToDelete);
          log.info("Xoá {} Redis keys khi thanh toán thất bại", keysToDelete.size());
        } catch (Exception ex) {
          log.error("Lỗi khi xoá Redis keys: {}", ex.getMessage());
        }

        booking
            .getTickets()
            .forEach(
                ticket -> {
                  ticket.setBooking(null);
                  ticket.setTicketStatus(TicketStatus.AVAILABLE);
                  ticketRepository.save(ticket);
                  simpMessagingTemplate.convertAndSend(
                      "/topic/showtime/" + ticket.getShowtime().getId() + "/seats",
                      SeatStatusEvent.builder()
                          .seatId(ticket.getSeat().getId())
                          .status("AVAILABLE")
                          .build());
                });
      }

      bookingRepository.save(booking);
      if (paymentSuccess) {
        eventPublisher.publishEvent(new BookingPaidEvent(booking.getId()));
      }
      return rsp("00", "Confirm Success");

    } catch (Exception e) {
      log.error("Error processing IPN: {}", e.getMessage(), e);
    }
    return params;
  }

  private Map<String, String> rsp(String code, String message) {
    Map<String, String> m = new HashMap<>();
    m.put("RspCode", code);
    m.put("Message", message);
    return m;
  }

  private Optional<Booking> findBookingByTxnRef(String txnRef) {
    try {
      Optional<Booking> bookingOpt = bookingRepository.findById(Long.valueOf(txnRef));
      if (bookingOpt.isPresent()) {
        return bookingOpt;
      }
    } catch (NumberFormatException e) {
    }
    return bookingRepository.findByBookingCode(txnRef);
  }

  private String getOrCreateTicketQrCode(Booking booking, Ticket ticket) {
    if (ticket.getQrCode() != null && !ticket.getQrCode().isBlank()) {
      return ticket.getQrCode();
    }
    String seatCode =
        ticket.getSeat() == null || ticket.getSeat().getSeatCode() == null
            ? ""
            : ticket.getSeat().getSeatCode();
    return "CINEMAHUB|BOOKING="
        + booking.getBookingCode()
        + "|TICKET="
        + ticket.getId()
        + "|SEAT="
        + seatCode;
  }

  private static Map<String, String> createTransactionStatusDesc() {
    Map<String, String> map = new HashMap<>();
    map.put("00", "Giao dich thanh cong");
    map.put("01", "Giao dich chua hoan tat");
    map.put("02", "Giao dich bi loi");
    map.put("04", "Giao dich dao");
    map.put("05", "VNPAY dang xu ly giao dich nay");
    map.put("06", "VNPAY da gui yeu cau hoan tien sang Ngan hang");
    map.put("07", "Giao dich bi nghi ngo gian lan");
    map.put("09", "GD Hoan tra bi tu choi");
    return map;
  }

  private static Map<String, String> createResponseCodeDesc() {
    Map<String, String> map = new HashMap<>();
    map.put("00", "Giao dich thanh cong");
    map.put("07", "Tru tien thanh cong. Giao dich bi nghi ngo");
    map.put("09", "The/Tai khoan chua dang ky InternetBanking");
    map.put("10", "Xac thuc thong tin the/tai khoan khong dung qua 3 lan");
    map.put("11", "Da het han cho thanh toan");
    map.put("12", "The/Tai khoan bi khoa");
    map.put("13", "Nhap sai OTP");
    map.put("24", "Khach hang huy giao dich");
    map.put("51", "Tai khoan khong du so du");
    map.put("65", "Tai khoan vuot qua han muc giao dich trong ngay");
    map.put("75", "Ngan hang thanh toan dang bao tri");
    map.put("79", "Nhap sai mat khau thanh toan qua so lan quy dinh");
    map.put("99", "Loi khac");
    return map;
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
