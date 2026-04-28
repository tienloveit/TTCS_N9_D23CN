package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateFoodRequest {
  @NotBlank(message = "Food name is required")
  private String name;

  private String description;

  @NotNull(message = "Food price is required")
  @DecimalMin(value = "0.0", inclusive = false, message = "Food price must be greater than 0")
  private BigDecimal price;

  private String imageUrl;

  private Boolean active;
}
