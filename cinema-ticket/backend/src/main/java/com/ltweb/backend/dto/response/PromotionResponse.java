package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.MembershipTier;
import java.math.BigDecimal;
import java.time.LocalDateTime;
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
public class PromotionResponse {
  private Long id;
  private String code;
  private String description;
  private Integer discountPercent;
  private BigDecimal maxDiscount;
  private BigDecimal minOrderAmount;
  private MembershipTier minMembershipTier;
  private Long branchId;
  private String branchName;
  private LocalDateTime startDate;
  private LocalDateTime endDate;
  private Integer usageLimit;
  private Integer usedCount;
  private Boolean active;
  private LocalDateTime createdAt;
}
