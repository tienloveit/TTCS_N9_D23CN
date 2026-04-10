package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.BookingFood;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingFoodRepository extends JpaRepository<BookingFood, Integer> {
}