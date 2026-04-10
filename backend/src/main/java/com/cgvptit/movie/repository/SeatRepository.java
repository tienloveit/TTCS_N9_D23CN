package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatRepository extends JpaRepository<Seat, Integer> {
}