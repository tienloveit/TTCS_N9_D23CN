package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.UpdateSystemSettingRequest;
import com.ltweb.backend.dto.response.SystemSettingResponse;
import com.ltweb.backend.entity.SystemSetting;
import com.ltweb.backend.enums.AuditAction;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.SystemSettingRepository;
import jakarta.annotation.PostConstruct;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SystemSettingService {
  public static final String BOOKING_HOLD_MINUTES = "booking.holdMinutes";
  public static final String BOOKING_MAX_TICKETS_PER_TRANSACTION = "booking.maxTicketsPerTransaction";
  public static final String BOOKING_MAX_TICKETS_PER_MOVIE = "booking.maxTicketsPerMovie";
  public static final String REFUND_WINDOW_HOURS = "refund.windowHours";
  public static final String SUPPORT_EMAIL = "cinema.supportEmail";
  public static final String SUPPORT_HOTLINE = "cinema.supportHotline";

  private final SystemSettingRepository systemSettingRepository;
  private final AuditLogService auditLogService;

  @PostConstruct
  @Transactional
  public void seedDefaults() {
    createDefault(BOOKING_HOLD_MINUTES, "6", "So phut giu ghe khi khach dat ve");
    createDefault(
        BOOKING_MAX_TICKETS_PER_TRANSACTION,
        "8",
        "So ve toi da trong mot giao dich");
    createDefault(BOOKING_MAX_TICKETS_PER_MOVIE, "8", "So ve toi da moi khach cho mot phim");
    createDefault(REFUND_WINDOW_HOURS, "24", "So gio cho phep khach gui yeu cau hoan tien");
    createDefault(SUPPORT_EMAIL, "support@movieptit.vn", "Email ho tro khach hang");
    createDefault(SUPPORT_HOTLINE, "1900 0000", "Hotline ho tro khach hang");
  }

  @PreAuthorize("hasRole('ADMIN')")
  @Transactional(readOnly = true)
  public List<SystemSettingResponse> getAllSettings() {
    return systemSettingRepository.findAll().stream()
        .sorted(java.util.Comparator.comparing(SystemSetting::getSettingKey))
        .map(this::toResponse)
        .toList();
  }

  @PreAuthorize("hasRole('ADMIN')")
  @Transactional
  public SystemSettingResponse updateSetting(String settingKey, UpdateSystemSettingRequest request) {
    SystemSetting setting =
        systemSettingRepository
            .findBySettingKey(settingKey)
            .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR));
    setting.setSettingValue(request.getSettingValue().trim());
    if (request.getDescription() != null) {
      setting.setDescription(request.getDescription());
    }
    SystemSetting saved = systemSettingRepository.save(setting);
    auditLogService.record(
        AuditAction.SYSTEM_SETTING_UPDATED,
        "SystemSetting",
        saved.getSettingKey(),
        "Updated setting " + saved.getSettingKey());
    return toResponse(saved);
  }

  @Transactional(readOnly = true)
  public int getInt(String settingKey, int defaultValue) {
    return systemSettingRepository
        .findBySettingKey(settingKey)
        .map(SystemSetting::getSettingValue)
        .map(value -> parseInt(value, defaultValue))
        .orElse(defaultValue);
  }

  private int parseInt(String value, int defaultValue) {
    try {
      return Integer.parseInt(value.trim());
    } catch (RuntimeException ignored) {
      return defaultValue;
    }
  }

  private void createDefault(String key, String value, String description) {
    if (systemSettingRepository.existsBySettingKey(key)) {
      return;
    }
    systemSettingRepository.save(
        SystemSetting.builder()
            .settingKey(key)
            .settingValue(value)
            .description(description)
            .build());
  }

  private SystemSettingResponse toResponse(SystemSetting setting) {
    return SystemSettingResponse.builder()
        .id(setting.getId())
        .settingKey(setting.getSettingKey())
        .settingValue(setting.getSettingValue())
        .description(setting.getDescription())
        .updatedAt(setting.getUpdatedAt())
        .build();
  }
}
