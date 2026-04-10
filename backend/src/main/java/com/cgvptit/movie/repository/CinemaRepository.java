package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Cinema;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CinemaRepository extends JpaRepository<Cinema, Integer> {
}