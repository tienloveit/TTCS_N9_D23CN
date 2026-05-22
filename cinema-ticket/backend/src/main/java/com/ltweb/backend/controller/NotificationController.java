package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.NotificationResponse;
import com.ltweb.backend.service.NotificationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {
  private final NotificationService notificationService;

  @GetMapping
  public ApiResponse<List<NotificationResponse>> getMyNotifications() {
    notificationService.generateMissedShiftNotifications();
    notificationService.generateStaffShiftTimeNotificationsForCurrentUser();
    ApiResponse<List<NotificationResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(notificationService.getMyNotifications());
    return apiResponse;
  }

  @GetMapping("/unread-count")
  public ApiResponse<Long> getUnreadCount() {
    notificationService.generateMissedShiftNotifications();
    notificationService.generateStaffShiftTimeNotificationsForCurrentUser();
    ApiResponse<Long> apiResponse = new ApiResponse<>();
    apiResponse.setResult(notificationService.countUnread());
    return apiResponse;
  }

  @PostMapping("/{id}/read")
  public ApiResponse<NotificationResponse> markRead(@PathVariable Long id) {
    ApiResponse<NotificationResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(notificationService.markRead(id));
    apiResponse.setMessage("Notification marked as read");
    return apiResponse;
  }
}
