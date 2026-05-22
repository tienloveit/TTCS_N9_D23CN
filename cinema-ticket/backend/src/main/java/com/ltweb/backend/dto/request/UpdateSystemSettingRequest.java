package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateSystemSettingRequest {
  @NotBlank
  @Size(max = 1000)
  private String settingValue;

  @Size(max = 500)
  private String description;
}
