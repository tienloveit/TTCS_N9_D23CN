package com.cgvptit.movie.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    @NotBlank
    private String fullName;

    @Email
    @NotBlank
    private String email;

    @NotBlank
    @Size(min = 8, max = 100)
    private String password;

    private String phone;
}
