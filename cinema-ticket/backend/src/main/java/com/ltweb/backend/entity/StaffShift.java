package com.ltweb.backend.entity;

import com.ltweb.backend.enums.StaffShiftStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "staff_shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffShift {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "shift_id")
  private Long id;

  @ManyToOne
  @JoinColumn(name = "staff_id", nullable = false)
  private User staff;

  @ManyToOne
  @JoinColumn(name = "schedule_id")
  private StaffSchedule schedule;

  private Long branchId;

  @Builder.Default
  private BigDecimal openingCash = BigDecimal.ZERO;

  private BigDecimal closingCash;

  @Builder.Default
  private BigDecimal expectedCash = BigDecimal.ZERO;

  private BigDecimal cashDifference;

  private LocalDateTime openedAt;

  private LocalDateTime closedAt;

  @Column(length = 500)
  private String note;

  @Enumerated(EnumType.STRING)
  private StaffShiftStatus status;
}
