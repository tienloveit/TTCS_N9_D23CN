package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Director;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DirectorRepository extends JpaRepository<Director, Long> {
  Optional<Director> findFirstByNameIgnoreCase(String name);

  boolean existsByNameIgnoreCase(String name);
}
