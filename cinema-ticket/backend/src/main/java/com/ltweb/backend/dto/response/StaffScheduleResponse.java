package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.StaffScheduleStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StaffScheduleResponse {
  private Long scheduleId;
  private Long staffId;
  private String staffUsername;
  private String staffFullName;
  private Long branchId;
  private LocalDateTime startTime;
  private LocalDateTime endTime;
  private Long durationMinutes;
  private String position;
  private String note;
  private StaffScheduleStatus status;
  private Long createdById;
  private String createdByUsername;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
