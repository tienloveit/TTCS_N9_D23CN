package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Food;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FoodRepository extends JpaRepository<Food, Long> {
  List<Food> findByActiveTrueOrderByNameAsc();

  Optional<Food> findFirstByNameIgnoreCase(String name);
}
