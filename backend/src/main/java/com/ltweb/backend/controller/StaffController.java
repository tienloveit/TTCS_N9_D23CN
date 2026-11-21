package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.StaffCustomerLookupResponse;
import com.ltweb.backend.dto.response.StaffDashboardResponse;
import com.ltweb.backend.service.StaffCustomerService;
import com.ltweb.backend.service.StaffOperationsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/staff")
@RequiredArgsConstructor
public class StaffController {
  private final StaffOperationsService staffOperationsService;
  private final StaffCustomerService staffCustomerService;

  @GetMapping("/dashboard")
  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  public ApiResponse<StaffDashboardResponse> getDashboard() {
    ApiResponse<StaffDashboardResponse> response = new ApiResponse<>();
    response.setResult(staffOperationsService.getDashboard());
    return response;
  }

  /** Tra cứu khách theo email/SĐT trước khi bán vé tại quầy (thông tin trả về đã che bớt). */
  @GetMapping("/customers/lookup")
  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  public ApiResponse<StaffCustomerLookupResponse> lookupCustomer(
      @RequestParam(value = "email", required = false) String email,
      @RequestParam(value = "phone", required = false) String phone) {
    ApiResponse<StaffCustomerLookupResponse> response = new ApiResponse<>();
    response.setResult(staffCustomerService.lookup(email, phone));
    return response;
  }
}
