package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.MembershipTier;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreatePromotionRequest {
  @NotBlank(message = "Promotion code is required")
  private String code;

  private String description;

  @NotNull(message = "Discount percent is required")
  @Min(value = 1, message = "Discount must be at least 1%")
  @Max(value = 100, message = "Discount cannot exceed 100%")
  private Integer discountPercent;

  private BigDecimal maxDiscount;

  private BigDecimal minOrderAmount;

  private MembershipTier minMembershipTier;

  private Long branchId;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
  private LocalDateTime startDate;

  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
  private LocalDateTime endDate;

  private Integer usageLimit;

  private Boolean active;
}
