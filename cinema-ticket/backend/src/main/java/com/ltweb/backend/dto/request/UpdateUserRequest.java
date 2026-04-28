package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.UserRole;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
  private String fullName;
  private LocalDate dob;
  private String phoneNumber;
  private String gender;
  private String email;
  private UserRole role;
  private String status;
}
