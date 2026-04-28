package com.ltweb.backend.dto.request;

import lombok.Getter;

@Getter
public class ResetPasswordRequest {
  private String email;
  private String OTP;
  private String newPassword;
}
