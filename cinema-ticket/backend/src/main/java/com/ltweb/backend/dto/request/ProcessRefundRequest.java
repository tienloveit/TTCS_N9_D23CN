package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProcessRefundRequest {
  @NotNull
  private Boolean approved;

  @Size(max = 1000)
  private String note;
}
