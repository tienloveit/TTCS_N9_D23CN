package com.ltweb.backend.entity;

import com.ltweb.backend.enums.SeatType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "seat_type_prices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatTypePrice {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Enumerated(EnumType.STRING)
  @Column(name = "seat_type", nullable = false, unique = true)
  private SeatType seatType;

  @Column(nullable = false)
  private BigDecimal price;
}
