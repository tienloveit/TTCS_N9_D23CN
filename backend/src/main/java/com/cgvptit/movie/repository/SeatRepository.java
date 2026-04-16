package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Integer> {
    List<Seat> findByRoomId(Integer roomId);
    
    @Transactional
    void deleteByRoomId(Integer roomId);
}