package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.StaffScheduleStatus;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class UpdateStaffScheduleRequest {
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String position;
    private String note;
    private StaffScheduleStatus status;
}
