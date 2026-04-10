package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Food;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FoodRepository extends JpaRepository<Food, Integer> {
}