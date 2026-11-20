package com.ltweb.backend.service;

import com.ltweb.backend.entity.PaymentEvent;
import com.ltweb.backend.repository.PaymentEventRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Ghi nhật ký thanh toán trong transaction của nghiệp vụ đang chạy (không dùng REQUIRES_NEW: dòng
 * booking đang bị khóa FOR UPDATE, transaction khác sẽ phải chờ khóa đó khi kiểm tra khóa ngoại).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentEventService {
  private final PaymentEventRepository repository;
  private final Clock clock;

  /** Callback VNPay; chỉ lưu các trường cần đối soát, không lưu chữ ký. */
  public void recordCallback(
      PaymentEvent.Type type,
      Long bookingId,
      Map<String, String> params,
      boolean validSignature,
      String outcome,
      String message) {
    save(
        PaymentEvent.builder()
            .bookingId(bookingId)
            .eventType(type)
            .reference(limit(params.get("vnp_TxnRef"), 100))
            .providerTxnId(limit(params.get("vnp_TransactionNo"), 100))
            .amount(vnpayAmount(params.get("vnp_Amount")))
            .responseCode(limit(params.get("vnp_ResponseCode"), 20))
            .transactionStatus(limit(params.get("vnp_TransactionStatus"), 20))
            .validSignature(validSignature)
            .outcome(limit(outcome, 50))
            .message(limit(message, 500))
            .build());
  }

  /** Một lần gửi hoặc truy vấn hoàn tiền và kết quả cổng trả về. */
  public void recordRefund(
      PaymentEvent.Type type,
      Long bookingId,
      String requestId,
      String providerTxnId,
      BigDecimal amount,
      String responseCode,
      String outcome,
      String message) {
    save(
        PaymentEvent.builder()
            .bookingId(bookingId)
            .eventType(type)
            .reference(limit(requestId, 100))
            .providerTxnId(limit(providerTxnId, 100))
            .amount(amount)
            .responseCode(limit(responseCode, 20))
            .outcome(limit(outcome, 50))
            .message(limit(message, 500))
            .build());
  }

  private void save(PaymentEvent event) {
    event.setCreatedAt(LocalDateTime.now(clock));
    repository.save(event);
  }

  /** vnp_Amount tính theo đơn vị nhỏ nhất (x100). */
  private static BigDecimal vnpayAmount(String raw) {
    if (raw == null || !raw.matches("\\d{1,17}")) return null;
    return new BigDecimal(raw).movePointLeft(2);
  }

  private static String limit(String value, int max) {
    if (value == null) return null;
    return value.length() <= max ? value : value.substring(0, max);
  }
}
