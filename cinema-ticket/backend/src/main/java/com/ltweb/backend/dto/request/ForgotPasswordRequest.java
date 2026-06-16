package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ForgotPasswordRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email is invalid")
    private String email;
}
