package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Seat;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatRepository extends JpaRepository<Seat, Long> {

  @EntityGraph(attributePaths = {"room"})
  Optional<Seat> findById(Long id);

  @EntityGraph(attributePaths = {"room"})
  List<Seat> findByRoomId(Long roomId);

  boolean existsByRoomIdAndSeatCode(Long roomId, String seatCode);

  void deleteByRoomId(Long roomId);
}
