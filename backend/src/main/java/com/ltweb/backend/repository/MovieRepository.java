package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.enums.MovieStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

  /** Phim sắp chiếu đã tới ngày công chiếu (và chưa qua ngày kết thúc) chuyển sang đang chiếu. */
  @Modifying
  @Query(
      "update Movie m set m.status = com.ltweb.backend.enums.MovieStatus.NOW_SHOWING"
          + " where m.status = com.ltweb.backend.enums.MovieStatus.UPCOMING"
          + " and m.releaseDate is not null and m.releaseDate <= :today"
          + " and (m.endDate is null or m.endDate >= :today)")
  int startShowing(@Param("today") LocalDate today);

  /** Phim đã qua ngày kết thúc chuyển sang ENDED. */
  @Modifying
  @Query(
      "update Movie m set m.status = com.ltweb.backend.enums.MovieStatus.ENDED"
          + " where m.status in (com.ltweb.backend.enums.MovieStatus.UPCOMING,"
          + " com.ltweb.backend.enums.MovieStatus.NOW_SHOWING)"
          + " and m.endDate is not null and m.endDate < :today")
  int finishShowing(@Param("today") LocalDate today);
}
