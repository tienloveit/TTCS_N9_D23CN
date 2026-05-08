package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.UserRole;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {
  private String username;
  private String fullName;
  private String email;
  private String phoneNumber;

  @Size(min = 6, message = "Password must be at least 6 characters")
  private String password;

  private String gender;
  private LocalDate dob;
  private UserRole role;  // optional – admin can assign role at creation
}
