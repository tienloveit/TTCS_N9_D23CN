package com.ltweb.backend.repository;

import com.ltweb.backend.entity.MovieRating;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MovieRatingRepository extends JpaRepository<MovieRating, Long> {
  Optional<MovieRating> findByMovieIdAndUserId(Long movieId, Long userId);

  @EntityGraph(attributePaths = {"user"})
  Page<MovieRating> findByMovieId(Long movieId, Pageable pageable);

  void deleteByMovieId(Long movieId);

  Long countByMovieId(Long movieId);

  @Query("select avg(r.score) from MovieRating r where r.movie.id = :movieId")
  Double getAverageScoreByMovieId(@Param("movieId") Long movieId);

  @Query(
      "select r.movie.id as movieId, avg(r.score) as average, count(r) as total"
          + " from MovieRating r where r.movie.id in :movieIds group by r.movie.id")
  List<MovieRatingStats> findStatsByMovieIds(@Param("movieIds") Collection<Long> movieIds);
}
