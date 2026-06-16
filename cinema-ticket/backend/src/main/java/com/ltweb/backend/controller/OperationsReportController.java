package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.OperationsReportResponse;
import com.ltweb.backend.service.OperationsReportService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/operations")
@RequiredArgsConstructor
public class OperationsReportController {
    private final OperationsReportService operationsReportService;

    @GetMapping("/daily-report")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ApiResponse<OperationsReportResponse> getDailyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long branchId) {
        ApiResponse<OperationsReportResponse> apiResponse = new ApiResponse<>();
        apiResponse.setResult(operationsReportService.getDailyReport(date, branchId));
        return apiResponse;
    }
}
