package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.StaffDashboardResponse;
import com.ltweb.backend.service.StaffOperationsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/staff")
@RequiredArgsConstructor
public class StaffController {
    private final StaffOperationsService staffOperationsService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ApiResponse<StaffDashboardResponse> getDashboard() {
        ApiResponse<StaffDashboardResponse> response = new ApiResponse<>();
        response.setResult(staffOperationsService.getDashboard());
        return response;
    }

}
