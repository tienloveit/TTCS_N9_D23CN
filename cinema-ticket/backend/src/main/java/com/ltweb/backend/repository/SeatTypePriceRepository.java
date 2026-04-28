package com.ltweb.backend.repository;

import com.ltweb.backend.entity.SeatTypePrice;
import com.ltweb.backend.enums.SeatType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatTypePriceRepository extends JpaRepository<SeatTypePrice, Long> {
  boolean existsBySeatType(SeatType seatType);

  Optional<SeatTypePrice> findBySeatType(SeatType seatType);
}
