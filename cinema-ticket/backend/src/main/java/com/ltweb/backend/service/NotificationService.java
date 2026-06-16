package com.ltweb.backend.service;

import com.ltweb.backend.dto.response.NotificationResponse;
import com.ltweb.backend.entity.Notification;
import com.ltweb.backend.entity.StaffSchedule;
import com.ltweb.backend.entity.StaffShift;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.NotificationType;
import com.ltweb.backend.enums.StaffScheduleStatus;
import com.ltweb.backend.enums.StaffShiftStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.NotificationRepository;
import com.ltweb.backend.repository.StaffScheduleRepository;
import com.ltweb.backend.repository.StaffShiftRepository;
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
    private final StaffScheduleRepository staffScheduleRepository;
    private final StaffShiftRepository staffShiftRepository;

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
    public void notifyLowStock(Long branchId, Long foodId, String foodName, Integer stockQuantity) {
        String targetId = String.valueOf(foodId);
        if (notificationRepository.existsByTypeAndTargetTypeAndTargetId(
                NotificationType.LOW_STOCK, "Food", targetId)) {
            return;
        }
        String message = foodName + " sap het hang, ton kho hien tai: " + stockQuantity + ".";
        createForRole(UserRole.ADMIN, null, NotificationType.LOW_STOCK, "Can nhap kho", message, "Food", foodId);
        if (branchId != null) {
            createForRole(UserRole.MANAGER, branchId, NotificationType.LOW_STOCK, "Can nhap kho", message, "Food",
                    foodId);
        }
    }

    @Transactional
    public void notifyStaffSchedule(
            Long staffId, Long branchId, Long scheduleId, String title, String message) {
        notificationRepository.save(
                Notification.builder()
                        .recipientUserId(staffId)
                        .recipientRole(UserRole.STAFF)
                        .branchId(branchId)
                        .type(NotificationType.STAFF_SCHEDULE)
                        .title(title)
                        .message(message)
                        .targetType("StaffSchedule")
                        .targetId(scheduleId == null ? null : String.valueOf(scheduleId))
                        .build());
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

    @Transactional
    public void generateMissedShiftNotifications() {
        LocalDateTime now = LocalDateTime.now();
        staffScheduleRepository.findAll().stream()
                .filter(schedule -> schedule.getStatus() == StaffScheduleStatus.SCHEDULED)
                .filter(schedule -> schedule.getEndTime() != null && schedule.getEndTime().isBefore(now))
                .filter(schedule -> staffShiftRepository.findByScheduleIdOrderByOpenedAtDesc(schedule.getId())
                        .isEmpty())
                .forEach(this::createMissedShiftNotification);
    }

    @Transactional
    public void generateStaffShiftTimeNotificationsForCurrentUser() {
        User user = getCurrentUser();
        if (user.getRole() != UserRole.STAFF) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        staffScheduleRepository
                .findByStaffIdAndEndTimeGreaterThanEqualOrderByStartTimeAsc(
                        user.getId(), now.minusDays(1))
                .stream()
                .filter(schedule -> schedule.getStatus() != StaffScheduleStatus.CANCELLED)
                .forEach(schedule -> createStaffShiftTimeNotifications(user, schedule, now));
    }

    private void createStaffShiftTimeNotifications(User staff, StaffSchedule schedule, LocalDateTime now) {
        if (schedule.getStartTime() == null || schedule.getEndTime() == null) {
            return;
        }
        List<StaffShift> shifts = staffShiftRepository.findByScheduleIdOrderByOpenedAtDesc(schedule.getId());
        boolean hasShift = !shifts.isEmpty();
        boolean hasOpenShift = shifts.stream().anyMatch(shift -> shift.getStatus() == StaffShiftStatus.OPEN);

        if (!schedule.getStartTime().isAfter(now) && schedule.getEndTime().isAfter(now) && !hasShift) {
            createForUserIfAbsent(
                    staff.getId(),
                    schedule.getBranchId(),
                    NotificationType.SHIFT_START,
                    "StaffScheduleStart",
                    schedule.getId(),
                    "Da den ca truc",
                    "Ca truc cua ban da bat dau. Hay mo ca de ghi nhan thoi gian lam viec.");
        }

        if (!schedule.getEndTime().isAfter(now)) {
            if (hasOpenShift) {
                createForUserIfAbsent(
                        staff.getId(),
                        schedule.getBranchId(),
                        NotificationType.SHIFT_END,
                        "StaffScheduleEnd",
                        schedule.getId(),
                        "Den gio ket thuc ca",
                        "Ca truc cua ban da den gio ket thuc. Hay dong ca va doi soat tien mat.");
            } else if (!hasShift) {
                createForUserIfAbsent(
                        staff.getId(),
                        schedule.getBranchId(),
                        NotificationType.SHIFT_END,
                        "StaffScheduleEnd",
                        schedule.getId(),
                        "Ca truc da ket thuc",
                        "Ca truc da ket thuc nhung he thong chua ghi nhan ban mo ca.");
            }
        }
    }

    private void createMissedShiftNotification(StaffSchedule schedule) {
        String targetId = String.valueOf(schedule.getId());
        if (notificationRepository.existsByTypeAndTargetTypeAndTargetId(
                NotificationType.MISSED_SHIFT, "StaffSchedule", targetId)) {
            return;
        }
        String staffName = schedule.getStaff() == null
                ? "Nhan vien"
                : Objects.requireNonNullElse(schedule.getStaff().getFullName(), schedule.getStaff().getUsername());
        createForRole(
                UserRole.MANAGER,
                schedule.getBranchId(),
                NotificationType.MISSED_SHIFT,
                "Nhan vien chua mo ca",
                staffName + " khong mo ca cho lich truc da ket thuc.",
                "StaffSchedule",
                schedule.getId());
        createForRole(
                UserRole.ADMIN,
                null,
                NotificationType.MISSED_SHIFT,
                "Nhan vien chua mo ca",
                staffName + " khong mo ca cho lich truc da ket thuc.",
                "StaffSchedule",
                schedule.getId());
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

    private void createForUserIfAbsent(
            Long userId,
            Long branchId,
            NotificationType type,
            String targetType,
            Object targetId,
            String title,
            String message) {
        String targetIdText = targetId == null ? null : String.valueOf(targetId);
        if (notificationRepository.existsByTypeAndTargetTypeAndTargetId(
                type, targetType, targetIdText)) {
            return;
        }
        notificationRepository.save(
                Notification.builder()
                        .recipientUserId(userId)
                        .recipientRole(UserRole.STAFF)
                        .branchId(branchId)
                        .type(type)
                        .title(title)
                        .message(message)
                        .targetType(targetType)
                        .targetId(targetIdText)
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
