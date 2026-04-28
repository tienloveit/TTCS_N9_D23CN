package com.ltweb.backend.repository;

import com.ltweb.backend.entity.MovieRating;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MovieRatingRepository extends JpaRepository<MovieRating, Long> {
  Optional<MovieRating> findByMovieIdAndUserId(Long movieId, Long userId);

  void deleteByMovieId(Long movieId);

  Long countByMovieId(Long movieId);

  @Query("select avg(r.score) from MovieRating r where r.movie.id = :movieId")
  Double getAverageScoreByMovieId(@Param("movieId") Long movieId);
}
