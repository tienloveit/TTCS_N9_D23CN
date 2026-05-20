package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class CloseStaffShiftRequest {
  @NotNull
  @DecimalMin(value = "0.0", inclusive = true)
  private BigDecimal closingCash;

  private String note;
}
