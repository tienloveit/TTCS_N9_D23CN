package com.ltweb.backend.entity;

import com.ltweb.backend.enums.MembershipTier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "promotions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promotion {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(unique = true, nullable = false, length = 50)
  private String code;

  private String description;

  @Column(nullable = false)
  private Integer discountPercent;

  @Column(precision = 15, scale = 2)
  private BigDecimal maxDiscount;

  @Column(precision = 15, scale = 2)
  @Builder.Default
  private BigDecimal minOrderAmount = BigDecimal.ZERO;

  @Enumerated(EnumType.STRING)
  @Column(length = 20)
  private MembershipTier minMembershipTier;

  private Long branchId;

  private LocalDateTime startDate;

  private LocalDateTime endDate;

  private Integer usageLimit;

  @Builder.Default
  private Integer usedCount = 0;

  @Builder.Default
  private Boolean active = true;

  @Column(name = "created_at", updatable = false)
  @CreationTimestamp
  private LocalDateTime createdAt;
}
