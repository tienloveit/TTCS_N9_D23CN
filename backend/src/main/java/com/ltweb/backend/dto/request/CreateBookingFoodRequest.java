package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.Max;
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
  /** Giới hạn mỗi món trong một đơn; frontend dùng cùng giá trị (MAX_FOOD_QUANTITY). */
  public static final int MAX_QUANTITY = 50;

  @NotNull(message = "Food ID is required")
  private Long foodId;

  @NotNull(message = "Food quantity is required")
  @Min(value = 1, message = "Food quantity must be at least 1")
  @Max(value = MAX_QUANTITY, message = "Food quantity must be at most 50")
  private Integer quantity;
}
