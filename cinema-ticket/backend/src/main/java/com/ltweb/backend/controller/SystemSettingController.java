package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.UpdateSystemSettingRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.SystemSettingResponse;
import com.ltweb.backend.service.SystemSettingService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SystemSettingController {
  private final SystemSettingService systemSettingService;

  @GetMapping
  public ApiResponse<List<SystemSettingResponse>> getSettings() {
    ApiResponse<List<SystemSettingResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(systemSettingService.getAllSettings());
    return apiResponse;
  }

  @PutMapping("/{settingKey}")
  public ApiResponse<SystemSettingResponse> updateSetting(
      @PathVariable String settingKey, @RequestBody @Valid UpdateSystemSettingRequest request) {
    ApiResponse<SystemSettingResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("System setting updated successfully!");
    apiResponse.setResult(systemSettingService.updateSetting(settingKey, request));
    return apiResponse;
  }
}
