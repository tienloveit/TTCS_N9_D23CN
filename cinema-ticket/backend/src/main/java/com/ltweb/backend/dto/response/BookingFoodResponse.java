package com.ltweb.backend.dto.response;

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
public class BookingFoodResponse {
  private Long foodId;
  private String foodName;
  private Integer quantity;
  private BigDecimal unitPrice;
  private BigDecimal subtotal;
}
