package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.bookingCode = :code")
    Optional<Booking> findByBookingCodeForUpdate(@Param("code") String code);

    @EntityGraph(attributePaths = {
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

    @EntityGraph(attributePaths = {
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

    List<Booking> findByUserId(Long userId);

    @EntityGraph(attributePaths = {
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

    List<Booking> findByStatusAndExpiresAtBefore(BookingStatus status, LocalDateTime time);

    @Query("select b.id from Booking b where b.status = com.ltweb.backend.enums.BookingStatus.PENDING and b.expiresAt <= :time order by b.id")
    List<Long> findExpiredBookingIds(@Param("time") LocalDateTime time);

    List<Booking> findByShowtimeIdAndStatus(Long showtimeId, BookingStatus status);
}
