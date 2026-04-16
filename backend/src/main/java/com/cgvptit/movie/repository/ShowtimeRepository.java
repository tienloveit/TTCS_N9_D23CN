package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ShowtimeRepository extends JpaRepository<Showtime, Integer> {

    List<Showtime> findByRoomId(Integer roomId);

    List<Showtime> findByMovieId(Integer movieId);

    List<Showtime> findByRoomIdAndStartTimeBetween(Integer roomId,
                                                    LocalDateTime from,
                                                    LocalDateTime to);

    // Kiểm tra xung đột lịch: cùng phòng, thời gian bị overlap
    // overlap khi: startTime mới < endTime cũ VÀ endTime mới > startTime cũ
    @Query("SELECT COUNT(s) > 0 FROM Showtime s " +
           "WHERE s.room.id = :roomId " +
           "AND s.startTime < :endTime " +
           "AND s.endTime > :startTime " +
           "AND (:excludeId IS NULL OR s.id <> :excludeId)")
    boolean existsConflict(@Param("roomId") Integer roomId,
                           @Param("startTime") LocalDateTime startTime,
                           @Param("endTime") LocalDateTime endTime,
                           @Param("excludeId") Integer excludeId);
}