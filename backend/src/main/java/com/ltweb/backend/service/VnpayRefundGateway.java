package com.ltweb.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.enums.RefundGatewayStatus;
import com.ltweb.backend.util.VnpayUtil;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/** Gateway transport only. Business state is committed by BookingRefundService. */
@Service
@RequiredArgsConstructor
public class VnpayRefundGateway {
  private final java.time.Clock clock;
  private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
  private static final Set<String> DEFINITE_REJECTIONS =
      Set.of("02", "03", "04", "08", "13", "91", "93", "95", "97");
  private final VnpayProperties props;
  private final RestTemplate http;
  private final ObjectMapper json;

  public record Order(
      Long bookingId,
      String requestId,
      BigDecimal amount,
      String paymentTransactionNo,
      LocalDateTime paymentCreatedAt,
      LocalDateTime requestedAt,
      String operator,
      String ip) {}

  public record Result(RefundGatewayStatus status, String code, String message) {
    public static Result unknown() {
      return new Result(
          RefundGatewayStatus.UNKNOWN,
          null,
          "Chưa xác nhận được kết quả hoàn tiền. Kiểm tra lại kết quả trước khi tiếp tục.");
    }
  }

  public Result refund(Order order) {
    Map<String, String> p = common(order, "refund", order.requestId(), order.requestedAt());
    p.put("vnp_TransactionType", "02");
    p.put("vnp_Amount", minorAmount(order));
    p.put("vnp_TransactionNo", order.paymentTransactionNo());
    p.put("vnp_CreateBy", order.operator());
    p.put(
        "vnp_SecureHash",
        hash(
            p,
            "vnp_RequestId",
            "vnp_Version",
            "vnp_Command",
            "vnp_TmnCode",
            "vnp_TransactionType",
            "vnp_TxnRef",
            "vnp_Amount",
            "vnp_TransactionNo",
            "vnp_TransactionDate",
            "vnp_CreateBy",
            "vnp_CreateDate",
            "vnp_IpAddr",
            "vnp_OrderInfo"));
    return send(p, order, false);
  }

  public Result query(Order order) {
    Map<String, String> p =
        common(
            order,
            "querydr",
            UUID.randomUUID().toString().replace("-", ""),
            LocalDateTime.now(clock));
    p.put(
        "vnp_SecureHash",
        hash(
            p,
            "vnp_RequestId",
            "vnp_Version",
            "vnp_Command",
            "vnp_TmnCode",
            "vnp_TxnRef",
            "vnp_TransactionDate",
            "vnp_CreateDate",
            "vnp_IpAddr",
            "vnp_OrderInfo"));
    return send(p, order, true);
  }

  private Map<String, String> common(
      Order o, String command, String requestId, LocalDateTime date) {
    Map<String, String> p = new LinkedHashMap<>();
    p.put("vnp_RequestId", requestId);
    p.put("vnp_Version", "2.1.0");
    p.put("vnp_Command", command);
    p.put("vnp_TmnCode", props.getTmnCode());
    p.put("vnp_TxnRef", String.valueOf(o.bookingId()));
    p.put("vnp_TransactionDate", o.paymentCreatedAt().format(TIME));
    p.put("vnp_CreateDate", date.format(TIME));
    p.put("vnp_IpAddr", o.ip());
    p.put("vnp_OrderInfo", "Hoan tien don " + o.bookingId());
    return p;
  }

  private Result send(Map<String, String> payload, Order order, boolean query) {
    try {
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      String body =
          http.postForEntity(props.getApiUrl(), new HttpEntity<>(payload, headers), String.class)
              .getBody();
      Map<String, String> r = json.readValue(body, new TypeReference<Map<String, String>>() {});
      String expected =
          hash(
              r,
              "vnp_ResponseId",
              "vnp_Command",
              "vnp_ResponseCode",
              "vnp_Message",
              "vnp_TmnCode",
              "vnp_TxnRef",
              "vnp_Amount",
              "vnp_BankCode",
              "vnp_PayDate",
              "vnp_TransactionNo",
              "vnp_TransactionType",
              "vnp_TransactionStatus",
              "vnp_OrderInfo");
      if (query) {
        expected =
            hash(
                r,
                "vnp_ResponseId",
                "vnp_Command",
                "vnp_ResponseCode",
                "vnp_Message",
                "vnp_TmnCode",
                "vnp_TxnRef",
                "vnp_Amount",
                "vnp_BankCode",
                "vnp_PayDate",
                "vnp_TransactionNo",
                "vnp_TransactionType",
                "vnp_TransactionStatus",
                "vnp_OrderInfo",
                "vnp_PromotionCode",
                "vnp_PromotionAmount");
      }
      String signature = r.get("vnp_SecureHash");
      if (signature == null
          || !signature.matches("(?i)[0-9a-f]{128}")
          || !MessageDigest.isEqual(
              expected.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII),
              signature.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII))
          || !props.getTmnCode().equals(r.get("vnp_TmnCode"))
          || !String.valueOf(order.bookingId()).equals(r.get("vnp_TxnRef"))
          || !(query ? "querydr" : "refund").equals(r.get("vnp_Command"))
          || r.get("vnp_ResponseId") == null
          || r.get("vnp_ResponseId").isBlank()
          || !new BigInteger(minorAmount(order)).equals(new BigInteger(r.get("vnp_Amount")))) {
        return Result.unknown();
      }
      String code = r.get("vnp_ResponseCode");
      String state = r.get("vnp_TransactionStatus");
      boolean isRefund = "02".equals(r.get("vnp_TransactionType"));
      if ("00".equals(code)
          && isRefund
          && "00".equals(state)
          && r.get("vnp_TransactionNo") != null
          && !r.get("vnp_TransactionNo").isBlank()) {
        return new Result(
            RefundGatewayStatus.SUCCEEDED, code, "VNPay đã xác nhận hoàn tiền thành công.");
      }
      if ((!query && DEFINITE_REJECTIONS.contains(code))
          || ("00".equals(code) && isRefund && "09".equals(state))) {
        return new Result(
            RefundGatewayStatus.FAILED,
            code,
            "VNPay từ chối yêu cầu hoàn tiền. Kiểm tra giao dịch trước khi thử lại.");
      }
      // 94/98/99, processing states 05/06, or the original payment (type 01) are NOT proof of a
      // refund.
      return new Result(RefundGatewayStatus.UNKNOWN, code, Result.unknown().message());
    } catch (Exception uncertain) {
      // A timeout/malformed response can occur AFTER the gateway accepted the money operation.
      return Result.unknown();
    }
  }

  private String minorAmount(Order order) {
    return order.amount().movePointRight(2).toBigIntegerExact().toString();
  }

  private String hash(Map<String, String> fields, String... keys) {
    return VnpayUtil.hmacSHA512(
        props.getSecretKey(),
        java.util.Arrays.stream(keys)
            .map(key -> fields.getOrDefault(key, ""))
            .collect(java.util.stream.Collectors.joining("|")));
  }
}
