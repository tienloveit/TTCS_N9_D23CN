package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.ChangePasswordRequest;
import com.ltweb.backend.dto.request.ForgotPasswordRequest;
import com.ltweb.backend.dto.request.LoginRequest;
import com.ltweb.backend.dto.request.RefreshTokenRequest;
import com.ltweb.backend.dto.request.ResetPasswordRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.LoginResponse;
import com.ltweb.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AuthController {
  private final AuthService authService;

  @PostMapping("/auth/login")
  public ApiResponse<LoginResponse> login(@RequestBody LoginRequest loginRequest) {
    ApiResponse<LoginResponse> apiResponse = new ApiResponse<>();
    apiResponse.setCode(200);
    apiResponse.setMessage("Login successfully");
    apiResponse.setResult(authService.login(loginRequest));
    return apiResponse;
  }

  @PostMapping("/auth/logout")
  public ApiResponse<Void> logout(@RequestHeader("Authorization") String authHeader) {
    ApiResponse<Void> apiResponse = new ApiResponse<>();
    apiResponse.setCode(200);
    apiResponse.setMessage("Logout successfully");
    authService.logout(authHeader.replace("Bearer ", ""));
    return apiResponse;
  }

  @PostMapping("/auth/refresh")
  public ApiResponse<LoginResponse> refresh(@RequestBody RefreshTokenRequest refreshTokenRequest) {
    ApiResponse<LoginResponse> apiResponse = new ApiResponse<>();
    apiResponse.setCode(200);
    apiResponse.setMessage("Refresh token successfully");
    apiResponse.setResult(authService.refresh(refreshTokenRequest.getRefreshToken()));
    return apiResponse;
  }

  @PostMapping("/auth/change-password")
  public ApiResponse<Void> changePassword(
      @RequestBody ChangePasswordRequest changePasswordRequest) {
    ApiResponse<Void> apiResponse = new ApiResponse<>();
    apiResponse.setCode(200);
    apiResponse.setMessage("Change password successfully");
    authService.changePassword(
        changePasswordRequest.getCurrentPassword(), changePasswordRequest.getNewPassword());
    return apiResponse;
  }

  @PostMapping("/auth/forgot-password")
  public ApiResponse<Void> forgotPassword(
      @RequestBody ForgotPasswordRequest forgotPasswordRequest) {
    ApiResponse<Void> apiResponse = new ApiResponse<>();
    apiResponse.setCode(200);
    apiResponse.setMessage("OTP sent to email succesfully");
    authService.forgotPassword(forgotPasswordRequest.getEmail());
    return apiResponse;
  }

  @PostMapping("/auth/reset-password")
  public ApiResponse<Void> resetPassword(@RequestBody ResetPasswordRequest resetPasswordRequest) {
    ApiResponse<Void> apiResponse = new ApiResponse<>();
    apiResponse.setCode(200);
    apiResponse.setMessage("Password reset successfully");
    authService.resetPassword(
        resetPasswordRequest.getEmail(),
        resetPasswordRequest.getOTP(),
        resetPasswordRequest.getNewPassword());
    return apiResponse;
  }
}
