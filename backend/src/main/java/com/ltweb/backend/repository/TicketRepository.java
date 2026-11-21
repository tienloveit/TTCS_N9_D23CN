package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Ticket;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from Ticket t where t.showtime.id = :showtimeId order by t.id")
  List<Ticket> findByShowtimeIdForUpdate(@Param("showtimeId") Long showtimeId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "select t from Ticket t where t.showtime.id = :showtimeId and t.seat.id in :seatIds order by t.id")
  List<Ticket> findSeatsForUpdate(
      @Param("showtimeId") Long showtimeId, @Param("seatIds") List<Long> seatIds);

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

  int countByShowtimeId(Long showtimeId);

  int countByShowtimeIdAndTicketStatus(
      Long showtimeId, com.ltweb.backend.enums.TicketStatus status);

  /** Số vé theo từng suất trong một truy vấn: mỗi dòng là {showtimeId, count}. */
  @Query(
      "select t.showtime.id, count(t) from Ticket t where t.showtime.id in :showtimeIds"
          + " group by t.showtime.id")
  List<Object[]> countGroupedByShowtimeIds(@Param("showtimeIds") Collection<Long> showtimeIds);

  /** Số vé thuộc đơn của chi nhánh được soát trong [start, end); branchId null là mọi chi nhánh. */
  @Query(
      """
      select count(t) from Ticket t
        join t.booking b
        join b.showtime s
        join s.room r
      where t.checkedInAt >= :start
        and t.checkedInAt < :end
        and (:branchId is null or r.branch.branchId = :branchId)
      """)
  long countCheckedInBetween(
      @Param("branchId") Long branchId,
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end);
}
