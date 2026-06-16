package com.ltweb.backend.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StaffDetailResponse {
    private UserResponse staff;
    private List<StaffScheduleResponse> schedules;
    private List<StaffShiftResponse> shiftHistory;
}
