package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Showtime;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

  @EntityGraph(attributePaths = {"room", "room.branch", "movie"})
  List<Showtime> findAll();

  @EntityGraph(attributePaths = {"room", "room.branch", "movie"})
  List<Showtime> findByRoomId(Long roomId);

  @EntityGraph(attributePaths = {"room", "room.branch", "movie"})
  List<Showtime> findByMovieId(Long movieId);

  @EntityGraph(attributePaths = {"room", "room.branch", "movie"})
  List<Showtime> findByStartTimeGreaterThanEqualAndStartTimeLessThanOrderByStartTimeAsc(
      LocalDateTime startOfDay, LocalDateTime endOfDay);

  @EntityGraph(attributePaths = {"room", "room.branch", "movie"})
  Optional<Showtime> findByRoomIdAndMovieIdAndStartTime(
      Long roomId, Long movieId, LocalDateTime startTime);

  @Query(
      """
          SELECT COUNT(s) > 0
          FROM Showtime s
          WHERE s.room.id = :roomId
            AND s.startTime < :endTime
            AND s.endTime > :startTime
      """)
  boolean existsOverlappingShowtime(
      @Param("roomId") Long roomId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime);

  @Query(
      """
          SELECT s FROM Showtime s
          WHERE s.room.branch.branchId = :branchId
            AND s.startTime >= :startOfDay
            AND s.startTime < :endOfDay
          ORDER BY s.movie.movieName, s.startTime
      """)
  List<Showtime> findByBranchAndDate(
      @Param("branchId") Long branchId,
      @Param("startOfDay") LocalDateTime startOfDay,
      @Param("endOfDay") LocalDateTime endOfDay);

  @Query(
      """
          SELECT COUNT(s) > 0
          FROM Showtime s
          WHERE s.room.id = :roomId
            AND s.id != :excludeId
            AND s.startTime < :endTime
            AND s.endTime > :startTime
      """)
  boolean existsOverlappingShowtimeExcluding(
      @Param("roomId") Long roomId,
      @Param("startTime") LocalDateTime startTime,
      @Param("endTime") LocalDateTime endTime,
      @Param("excludeId") Long excludeId);

  boolean existsByRoomId(Long roomId);
}
