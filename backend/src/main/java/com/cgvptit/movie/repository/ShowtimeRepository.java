package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShowtimeRepository extends JpaRepository<Showtime, Integer> {
}