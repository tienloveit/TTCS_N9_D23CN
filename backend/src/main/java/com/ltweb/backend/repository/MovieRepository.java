package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.enums.MovieStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {

  @EntityGraph(attributePaths = {"genres", "director"})
  List<Movie> findAll();

  @EntityGraph(attributePaths = {"genres", "director"})
  List<Movie> findByStatus(MovieStatus status);

  @EntityGraph(attributePaths = {"genres", "director"})
  List<Movie> findByMovieNameContainingIgnoreCase(String movieName);

  @EntityGraph(attributePaths = {"genres", "director"})
  Optional<Movie> findFirstByMovieNameIgnoreCase(String movieName);
}
