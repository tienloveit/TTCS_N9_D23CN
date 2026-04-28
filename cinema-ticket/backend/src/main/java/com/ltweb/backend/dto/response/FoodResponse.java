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
public class FoodResponse {
  private Long id;
  private String name;
  private String description;
  private BigDecimal price;
  private String imageUrl;
  private Boolean active;
}
