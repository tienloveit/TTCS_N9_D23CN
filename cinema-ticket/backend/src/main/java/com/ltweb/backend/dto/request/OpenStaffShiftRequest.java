package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class OpenStaffShiftRequest {
  @DecimalMin(value = "0.0", inclusive = true)
  private BigDecimal openingCash = BigDecimal.ZERO;

  private String note;
}
