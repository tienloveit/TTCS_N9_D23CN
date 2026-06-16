package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.RevenueReportResponse;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.service.RevenueReportService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/reports")
@RequiredArgsConstructor
public class RevenueReportController {
    private final RevenueReportService revenueReportService;

    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ApiResponse<RevenueReportResponse> getRevenueReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long staffId,
            @RequestParam(required = false) PaymentMethod paymentMethod) {
        ApiResponse<RevenueReportResponse> apiResponse = new ApiResponse<>();
        apiResponse.setResult(
                revenueReportService.getReport(from, to, branchId, movieId, staffId, paymentMethod));
        return apiResponse;
    }
}
