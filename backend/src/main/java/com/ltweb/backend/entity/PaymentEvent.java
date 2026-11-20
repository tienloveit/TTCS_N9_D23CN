package com.ltweb.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Nhật ký chỉ ghi thêm của mọi tương tác với cổng thanh toán: callback VNPay (return/IPN) và từng
 * lần gửi/truy vấn hoàn tiền. Payment chỉ giữ trạng thái mới nhất; bảng này giữ đủ lịch sử để đối
 * soát khi có tranh chấp.
 */
@Entity
@Table(
    name = "payment_events",
    indexes = {
      @Index(name = "idx_payment_events_booking", columnList = "booking_id, created_at"),
      @Index(name = "idx_payment_events_created_at", columnList = "created_at")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentEvent {
  public enum Type {
    VNPAY_RETURN,
    VNPAY_IPN,
    REFUND_SUBMIT,
    REFUND_QUERY
  }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /** NULL khi callback không khớp đơn nào (sai mã đơn hoặc sai chữ ký). */
  @Column(name = "booking_id")
  private Long bookingId;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR)
  @Column(name = "event_type", nullable = false, length = 30)
  private Type eventType;

  /** vnp_TxnRef của callback hoặc mã lần thử hoàn tiền. */
  @Column(length = 100)
  private String reference;

  @Column(length = 100)
  private String providerTxnId;

  @Column(precision = 15, scale = 2)
  private BigDecimal amount;

  /** vnp_ResponseCode hoặc mã phản hồi của cổng. */
  @Column(length = 20)
  private String responseCode;

  @Column(length = 20)
  private String transactionStatus;

  private Boolean validSignature;

  /** Kết quả hệ thống áp dụng: RspCode trả VNPay, hoặc trạng thái lần hoàn tiền. */
  @Column(length = 50)
  private String outcome;

  @Column(length = 500)
  private String message;

  @Column(nullable = false)
  private LocalDateTime createdAt;
}
