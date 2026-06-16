package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CloseStaffShiftRequest;
import com.ltweb.backend.dto.request.CreateStaffScheduleRequest;
import com.ltweb.backend.dto.request.OpenStaffShiftRequest;
import com.ltweb.backend.dto.request.UpdateStaffScheduleRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.StaffDetailResponse;
import com.ltweb.backend.dto.response.StaffDashboardResponse;
import com.ltweb.backend.dto.response.StaffScheduleResponse;
import com.ltweb.backend.dto.response.StaffShiftResponse;
import com.ltweb.backend.service.StaffOperationsService;
import com.ltweb.backend.service.StaffScheduleService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/staff")
@RequiredArgsConstructor
public class StaffController {
    private final StaffOperationsService staffOperationsService;
    private final StaffScheduleService staffScheduleService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ApiResponse<StaffDashboardResponse> getDashboard() {
        ApiResponse<StaffDashboardResponse> response = new ApiResponse<>();
        response.setResult(staffOperationsService.getDashboard());
        return response;
    }

    @GetMapping("/shift/active")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ApiResponse<StaffShiftResponse> getActiveShift() {
        ApiResponse<StaffShiftResponse> response = new ApiResponse<>();
        response.setResult(staffOperationsService.getActiveShiftForCurrentUser());
        return response;
    }

    @GetMapping("/shift/history")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ApiResponse<List<StaffShiftResponse>> getShiftHistory() {
        ApiResponse<List<StaffShiftResponse>> response = new ApiResponse<>();
        response.setResult(staffOperationsService.getShiftHistoryForCurrentUser());
        return response;
    }

    @GetMapping("/schedules/my")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ApiResponse<List<StaffScheduleResponse>> getMySchedules() {
        ApiResponse<List<StaffScheduleResponse>> response = new ApiResponse<>();
        response.setResult(staffScheduleService.getMySchedules());
        return response;
    }

    @GetMapping("/manager/staff/{staffId}/detail")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ApiResponse<StaffDetailResponse> getStaffDetail(@PathVariable Long staffId) {
        ApiResponse<StaffDetailResponse> response = new ApiResponse<>();
        response.setResult(staffScheduleService.getStaffDetail(staffId));
        return response;
    }

    @PostMapping("/manager/schedules")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ApiResponse<StaffScheduleResponse> createSchedule(
            @RequestBody @Valid CreateStaffScheduleRequest request) {
        ApiResponse<StaffScheduleResponse> response = new ApiResponse<>();
        response.setMessage("Staff schedule created successfully!");
        response.setResult(staffScheduleService.createSchedule(request));
        return response;
    }

    @PutMapping("/manager/schedules/{scheduleId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ApiResponse<StaffScheduleResponse> updateSchedule(
            @PathVariable Long scheduleId, @RequestBody @Valid UpdateStaffScheduleRequest request) {
        ApiResponse<StaffScheduleResponse> response = new ApiResponse<>();
        response.setMessage("Staff schedule updated successfully!");
        response.setResult(staffScheduleService.updateSchedule(scheduleId, request));
        return response;
    }

    @DeleteMapping("/manager/schedules/{scheduleId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ApiResponse<StaffScheduleResponse> cancelSchedule(@PathVariable Long scheduleId) {
        ApiResponse<StaffScheduleResponse> response = new ApiResponse<>();
        response.setMessage("Staff schedule cancelled successfully!");
        response.setResult(staffScheduleService.cancelSchedule(scheduleId));
        return response;
    }

    @PostMapping("/shift/open")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ApiResponse<StaffShiftResponse> openShift(
            @RequestBody @Valid OpenStaffShiftRequest request) {
        ApiResponse<StaffShiftResponse> response = new ApiResponse<>();
        response.setMessage("Staff shift opened successfully!");
        response.setResult(staffOperationsService.openShift(request));
        return response;
    }

    @PostMapping("/shift/close")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ApiResponse<StaffShiftResponse> closeShift(
            @RequestBody @Valid CloseStaffShiftRequest request) {
        ApiResponse<StaffShiftResponse> response = new ApiResponse<>();
        response.setMessage("Staff shift closed successfully!");
        response.setResult(staffOperationsService.closeShift(request));
        return response;
    }
}
