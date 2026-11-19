package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookingFoodRequest {
  @NotNull(message = "Food ID is required")
  private Long foodId;

  @NotNull(message = "Food quantity is required")
  @Min(value = 1, message = "Food quantity must be at least 1")
  private Integer quantity;
}
