package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

  @EntityGraph(
      attributePaths = {
        "user",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch",
        "tickets",
        "tickets.seat"
      })
  List<Booking> findAll();

  @EntityGraph(
      attributePaths = {
        "user",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch",
        "tickets",
        "tickets.seat"
      })
  Optional<Booking> findById(Long id);

  List<Booking> findByUserId(Long userId);

  @EntityGraph(
      attributePaths = {
        "user",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch",
        "tickets",
        "tickets.seat"
      })
  Optional<Booking> findByBookingCode(String bookingCode);

  List<Booking> findByStatusAndExpiresAtBefore(BookingStatus status, LocalDateTime time);

  List<Booking> findByShowtimeIdAndStatus(Long showtimeId, BookingStatus status);
}
