package com.ltweb.backend.service;

import com.ltweb.backend.dto.response.NotificationResponse;
import com.ltweb.backend.entity.Notification;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.NotificationType;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.NotificationRepository;
import com.ltweb.backend.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void notifyRefundRequest(Long branchId, Long bookingId, String bookingCode) {
        createForRole(
                UserRole.ADMIN,
                null,
                NotificationType.REFUND_REQUEST,
                "Co yeu cau hoan tien moi",
                "Don " + bookingCode + " dang cho duyet hoan tien.",
                "Booking",
                bookingId);
        if (branchId != null) {
            createForRole(
                    UserRole.MANAGER,
                    branchId,
                    NotificationType.REFUND_REQUEST,
                    "Co yeu cau hoan tien tai chi nhanh",
                    "Don " + bookingCode + " dang cho manager xu ly.",
                    "Booking",
                    bookingId);
        }
    }

    @Transactional
    public void notifyLowStock(Long branchId, Long foodId, String foodName, int remaining) {
        String title = remaining <= 0 ? "Bap nuoc da het hang" : "Bap nuoc sap het hang";
        String message = "Mon " + foodName + " con " + remaining + " phan trong kho.";
        createForRole(UserRole.ADMIN, null, NotificationType.LOW_STOCK, title, message, "Food", foodId);
        if (branchId != null) {
            createForRole(UserRole.MANAGER, branchId, NotificationType.LOW_STOCK, title, message, "Food", foodId);
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications() {
        User user = getCurrentUser();
        return notificationRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .filter(notification -> canView(user, notification))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnread() {
        User user = getCurrentUser();
        return notificationRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .filter(notification -> canView(user, notification))
                .filter(notification -> notification.getReadAt() == null)
                .count();
    }

    @Transactional
    public NotificationResponse markRead(Long notificationId) {
        User user = getCurrentUser();
        Notification notification = notificationRepository
                .findById(notificationId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR));
        if (!canView(user, notification)) {
            throw new AccessDeniedException("Notification access denied");
        }
        notification.setReadAt(LocalDateTime.now());
        return toResponse(notificationRepository.save(notification));
    }

    private void createForRole(
            UserRole role,
            Long branchId,
            NotificationType type,
            String title,
            String message,
            String targetType,
            Object targetId) {
        notificationRepository.save(
                Notification.builder()
                        .recipientRole(role)
                        .branchId(branchId)
                        .type(type)
                        .title(title)
                        .message(message)
                        .targetType(targetType)
                        .targetId(targetId == null ? null : String.valueOf(targetId))
                        .build());
    }

    private boolean canView(User user, Notification notification) {
        if (notification.getRecipientUserId() != null
                && Objects.equals(notification.getRecipientUserId(), user.getId())) {
            return true;
        }
        if (notification.getRecipientRole() != null && notification.getRecipientRole() != user.getRole()) {
            return false;
        }
        if (user.getRole() == UserRole.ADMIN) {
            return notification.getRecipientRole() == null || notification.getRecipientRole() == UserRole.ADMIN;
        }
        if (user.getRole() == UserRole.MANAGER) {
            return notification.getBranchId() != null && Objects.equals(notification.getBranchId(), user.getBranchId());
        }
        if (user.getRole() == UserRole.STAFF) {
            if (notification.getRecipientUserId() != null) {
                return Objects.equals(notification.getRecipientUserId(), user.getId());
            }
            return notification.getRecipientRole() == UserRole.STAFF
                    && notification.getBranchId() != null
                    && Objects.equals(notification.getBranchId(), user.getBranchId());
        }
        return notification.getRecipientUserId() != null
                && Objects.equals(notification.getRecipientUserId(), user.getId());
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .notificationId(notification.getId())
                .recipientUserId(notification.getRecipientUserId())
                .recipientRole(notification.getRecipientRole())
                .branchId(notification.getBranchId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .targetType(notification.getTargetType())
                .targetId(notification.getTargetId())
                .read(notification.getReadAt() != null)
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private User getCurrentUser() {
        return userRepository
                .findByUsername(SecurityContextHolder.getContext().getAuthentication().getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }
}
