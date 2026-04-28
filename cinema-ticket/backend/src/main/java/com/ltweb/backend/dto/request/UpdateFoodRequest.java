package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
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
public class UpdateFoodRequest {
  private String name;

  private String description;

  @DecimalMin(value = "0.0", inclusive = false, message = "Food price must be greater than 0")
  private BigDecimal price;

  private String imageUrl;

  private Boolean active;
}
