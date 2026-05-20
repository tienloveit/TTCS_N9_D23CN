package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CreateStaffScheduleRequest {
  @NotNull private Long staffId;
  @NotNull private LocalDateTime startTime;
  @NotNull private LocalDateTime endTime;
  private String position;
  private String note;
}
