package com.ltweb.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Thời điểm một người dùng đọc một thông báo. Thông báo gửi theo role/chi nhánh được nhiều người
 * cùng thấy, nên trạng thái đã đọc phải tách theo từng người.
 */
@Entity
@Table(
    name = "notification_reads",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_notification_reads_notification_user",
            columnNames = {"notification_id", "user_id"}),
    indexes = @Index(name = "idx_notification_reads_user", columnList = "user_id, notification_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationRead {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "notification_id", nullable = false)
  private Long notificationId;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(nullable = false)
  private LocalDateTime readAt;
}
