package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.BranchStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateBranchRequest {
  @NotBlank(message = "Branch code is required")
  @Size(max = 50, message = "Branch code must be at most 50 characters")
  private String branchCode;

  @NotBlank(message = "Branch name is required")
  @Size(max = 255, message = "Branch name must be at most 255 characters")
  private String name;

  @Size(max = 255, message = "Address must be at most 255 characters")
  private String address;

  @Size(max = 100, message = "City must be at most 100 characters")
  private String city;

  @Size(max = 20, message = "Phone must be at most 20 characters")
  private String phone;

  private BranchStatus status;
}
