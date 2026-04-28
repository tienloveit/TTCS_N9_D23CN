package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Ticket;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

  @EntityGraph(attributePaths = {"seat", "showtime"})
  List<Ticket> findAll();

  @EntityGraph(
      attributePaths = {
        "booking",
        "booking.user",
        "booking.tickets",
        "booking.tickets.seat",
        "seat",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch"
      })
  Optional<Ticket> findById(Long id);

  @EntityGraph(attributePaths = {"seat", "showtime"})
  List<Ticket> findByShowtimeId(Long showtimeId);

  @EntityGraph(attributePaths = {"seat", "showtime", "showtime.movie", "showtime.room"})
  Optional<Ticket> findByShowtimeIdAndSeatId(Long showtimeId, Long seatId);

  @EntityGraph(
      attributePaths = {
        "booking",
        "booking.user",
        "booking.tickets",
        "booking.tickets.seat",
        "seat",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch"
      })
  Optional<Ticket> findByQrCode(String qrCode);

  void deleteByShowtimeId(Long showtimeId);
}
