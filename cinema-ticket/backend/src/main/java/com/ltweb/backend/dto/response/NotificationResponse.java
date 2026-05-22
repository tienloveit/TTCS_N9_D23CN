package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.NotificationType;
import com.ltweb.backend.enums.UserRole;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationResponse {
  private Long notificationId;
  private Long recipientUserId;
  private UserRole recipientRole;
  private Long branchId;
  private NotificationType type;
  private String title;
  private String message;
  private String targetType;
  private String targetId;
  private boolean read;
  private LocalDateTime readAt;
  private LocalDateTime createdAt;
}
