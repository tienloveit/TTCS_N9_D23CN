package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Genre;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GenreRepository extends JpaRepository<Genre, Long> {
  Optional<Genre> findFirstByNameIgnoreCase(String name);
}
