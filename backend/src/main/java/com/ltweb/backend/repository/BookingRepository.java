package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
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
import org.springframework.stereotype.Repository;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Booking b where b.id = :id")
  Optional<Booking> findByIdForUpdate(@Param("id") Long id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Booking b where b.bookingCode = :code")
  Optional<Booking> findByBookingCodeForUpdate(@Param("code") String code);

  @EntityGraph(
      attributePaths = {
        "user",
        "staffUser",
        "payment",
        "payment.refundProcessedBy",
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
        "staffUser",
        "payment",
        "payment.refundProcessedBy",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch",
        "tickets",
        "tickets.seat"
      })
  Optional<Booking> findById(Long id);

  @EntityGraph(
      attributePaths = {
        "user",
        "staffUser",
        "payment",
        "payment.refundProcessedBy",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch",
        "tickets",
        "tickets.seat"
      })
  List<Booking> findByUserId(Long userId);

  /** Đơn thuộc một chi nhánh, lọc ở DB thay vì tải toàn bộ rồi lọc trong bộ nhớ. */
  @EntityGraph(
      attributePaths = {
        "user",
        "staffUser",
        "payment",
        "payment.refundProcessedBy",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch",
        "tickets",
        "tickets.seat"
      })
  @Query("select b from Booking b where b.showtime.room.branch.branchId = :branchId")
  List<Booking> findByBranchId(@Param("branchId") Long branchId);

  @EntityGraph(
      attributePaths = {
        "user",
        "staffUser",
        "payment",
        "payment.refundProcessedBy",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch",
        "tickets",
        "tickets.seat"
      })
  List<Booking> findByStatusIn(Collection<BookingStatus> statuses);

  @EntityGraph(
      attributePaths = {
        "user",
        "staffUser",
        "payment",
        "payment.refundProcessedBy",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch",
        "tickets",
        "tickets.seat"
      })
  @Query(
      "select b from Booking b where b.showtime.room.branch.branchId = :branchId"
          + " and b.status in :statuses")
  List<Booking> findByBranchIdAndStatusIn(
      @Param("branchId") Long branchId, @Param("statuses") Collection<BookingStatus> statuses);

  @EntityGraph(
      attributePaths = {
        "user",
        "staffUser",
        "payment",
        "payment.refundProcessedBy",
        "showtime",
        "showtime.movie",
        "showtime.room",
        "showtime.room.branch",
        "tickets",
        "tickets.seat"
      })
  Optional<Booking> findByBookingCode(String bookingCode);

  boolean existsByBookingCode(String bookingCode);

  List<Booking> findByStatusAndExpiresAtBefore(BookingStatus status, LocalDateTime time);

  @Query(
      "select b.id from Booking b where b.status = com.ltweb.backend.enums.BookingStatus.PENDING and b.expiresAt <= :time order by b.id")
  List<Long> findExpiredBookingIds(@Param("time") LocalDateTime time);

  List<Booking> findByShowtimeIdAndStatus(Long showtimeId, BookingStatus status);

  /** Số đơn của khách đang chờ thanh toán và còn hạn giữ ghế. */
  long countByUserIdAndStatusAndExpiresAtAfter(
      Long userId, BookingStatus status, LocalDateTime time);
}
