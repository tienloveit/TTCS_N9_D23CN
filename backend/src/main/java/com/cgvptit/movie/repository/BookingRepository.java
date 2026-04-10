package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, Integer> {
}