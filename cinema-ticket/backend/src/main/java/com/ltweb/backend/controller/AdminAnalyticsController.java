package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.AdminAnalyticsResponse;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.service.AdminAnalyticsService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {
  private final AdminAnalyticsService adminAnalyticsService;

  @GetMapping("/dashboard")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public ApiResponse<AdminAnalyticsResponse> getDashboard(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate to) {
    ApiResponse<AdminAnalyticsResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(adminAnalyticsService.getDashboard(from, to));
    return apiResponse;
  }
}
