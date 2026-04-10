package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.City;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRepository extends JpaRepository<City, Integer> {
}