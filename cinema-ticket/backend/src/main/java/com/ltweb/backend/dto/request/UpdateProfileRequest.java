package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Only fields that an account holder is allowed to change. */
@Getter
@Setter
public class UpdateProfileRequest {
    @Size(max = 255)
    private String fullName;
    @PastOrPresent
    private LocalDate dob;
    @Size(max = 20)
    private String phoneNumber;
    @Pattern(regexp = "MALE|FEMALE|OTHER")
    private String gender;
    @Email
    @Size(max = 255)
    private String email;
}
