package com.ltweb.backend.entity;

import com.ltweb.backend.enums.BookingStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "bookings",
    indexes = {
      // Đếm đơn chờ thanh toán của khách (giới hạn đơn PENDING).
      @jakarta.persistence.Index(
          name = "idx_bookings_user_status_expires",
          columnList = "user_id, status, expires_at"),
      // Job dọn đơn hết hạn.
      @jakarta.persistence.Index(
          name = "idx_bookings_status_expires",
          columnList = "status, expires_at")
    })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(unique = true, nullable = false)
  private String bookingCode;

  @ManyToOne
  @JoinColumn(name = "user_id")
  private User user;

  @ManyToOne
  @JoinColumn(name = "booked_staff")
  private User staffUser;

  @ManyToOne
  @JoinColumn(name = "showtime_id", nullable = false)
  private Showtime showtime;

  @Column(nullable = false, precision = 15, scale = 2)
  @Builder.Default
  private BigDecimal totalAmount = BigDecimal.ZERO;

  private String promotionCode;

  @Column(nullable = false, precision = 15, scale = 2)
  @Builder.Default
  private BigDecimal discountAmount = BigDecimal.ZERO;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private BookingStatus status;

  private LocalDateTime expiresAt;

  /**
   * TRUE khi lượt dùng khuyến mãi đã được giữ lúc tạo/áp mã và phải trả lại nếu đơn không được
   * thanh toán. NULL với đơn tạo trước cơ chế giữ lượt (lượt được tính khi thanh toán).
   */
  @Column(name = "promotion_usage_reserved")
  private Boolean promotionUsageReserved;

  /**
   * TRUE khi số tiền đơn đã được cộng vào tổng chi tiêu của khách. FALSE với thanh toán đến sau khi
   * đơn đã hủy (không xuất vé, chỉ chờ hoàn tiền). NULL với đơn cũ: coi như đã cộng nếu đã thanh
   * toán.
   */
  @Column(name = "spending_recorded")
  private Boolean spendingRecorded;

  @Column(name = "created_at", updatable = false)
  @CreationTimestamp
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  @UpdateTimestamp
  private LocalDateTime updatedAt;

  @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private Payment payment = new Payment();

  public void setPayment(Payment payment) {
    this.payment = payment;
    if (payment != null) {
      payment.setBooking(this);
    }
  }

  @PrePersist
  private void attachPayment() {
    if (payment == null) {
      payment = new Payment();
    }
    payment.setBooking(this);
    payment.setAmount(totalAmount);
  }

  // Tickets belong to a showtime's seat inventory and must survive cancellation/refund.
  @OneToMany(mappedBy = "booking")
  @Builder.Default
  private List<Ticket> tickets = new ArrayList<>();

  @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private List<BookingFood> bookingFoods = new ArrayList<>();
}
