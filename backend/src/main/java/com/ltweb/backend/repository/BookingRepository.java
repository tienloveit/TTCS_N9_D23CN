package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long>, BookingSearchRepository {

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

  // ===== Báo cáo và dashboard: lọc ở DB, chỉ tải các đơn liên quan =====
  // Đơn "đã thanh toán" = COMPLETED hoặc payment PAID. Ngày thanh toán của báo cáo =
  // paidAt, nếu thiếu thì updatedAt, rồi createdAt, cuối cùng là :now (khớp getPaymentDate
  // trong các service báo cáo). Tham số null nghĩa là không lọc theo tiêu chí đó.

  /** Đơn đã thanh toán có ngày thanh toán trong [start, end), lọc theo tiêu chí tùy chọn. */
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
      """
      select b from Booking b
        join b.payment p
        join b.showtime s
        join s.room r
        left join b.staffUser su
      where (b.status = com.ltweb.backend.enums.BookingStatus.COMPLETED
             or p.paymentStatus = com.ltweb.backend.enums.PaymentStatus.PAID)
        and coalesce(p.paidAt, b.updatedAt, b.createdAt, :now) >= :start
        and coalesce(p.paidAt, b.updatedAt, b.createdAt, :now) < :end
        and (:branchId is null or r.branch.branchId = :branchId)
        and (:movieId is null or s.movie.id = :movieId)
        and (:staffId is null or su.id = :staffId)
        and (:paymentMethod is null or p.paymentMethod = :paymentMethod)
      order by b.id
      """)
  List<Booking> findPaidByPaymentDate(
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end,
      @Param("now") LocalDateTime now,
      @Param("branchId") Long branchId,
      @Param("movieId") Long movieId,
      @Param("staffId") Long staffId,
      @Param("paymentMethod") PaymentMethod paymentMethod);

  /** Đơn đã thanh toán của các suất bắt đầu trong [start, end), dùng tính lấp đầy theo suất. */
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
      """
      select b from Booking b
        join b.payment p
        join b.showtime s
        join s.room r
      where (b.status = com.ltweb.backend.enums.BookingStatus.COMPLETED
             or p.paymentStatus = com.ltweb.backend.enums.PaymentStatus.PAID)
        and s.startTime >= :start
        and s.startTime < :end
        and (:branchId is null or r.branch.branchId = :branchId)
      order by b.id
      """)
  List<Booking> findPaidByShowtimeStart(
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end,
      @Param("branchId") Long branchId);

  /**
   * Đơn bán bởi một nhân viên có ngày nghiệp vụ (paidAt, nếu thiếu thì createdAt, cuối cùng là
   * :start) trong [start, end). Khớp {@code StaffOperationsService.getBusinessDate}.
   */
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
      """
      select b from Booking b
        join b.payment p
        join b.showtime s
        join s.room r
      where b.staffUser.id = :staffId
        and coalesce(p.paidAt, b.createdAt, :start) >= :start
        and coalesce(p.paidAt, b.createdAt, :start) < :end
        and (:branchId is null or r.branch.branchId = :branchId)
      order by b.id
      """)
  List<Booking> findStaffBookingsByBusinessDate(
      @Param("staffId") Long staffId,
      @Param("branchId") Long branchId,
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end);

  /** Đơn tiền mặt của nhân viên được thu hoặc hoàn trong [start, end), dùng đối soát két. */
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
      """
      select b from Booking b
        join b.payment p
        join b.showtime s
        join s.room r
      where b.staffUser.id = :staffId
        and p.paymentMethod = com.ltweb.backend.enums.PaymentMethod.CASH
        and ((p.paidAt >= :start and p.paidAt < :end)
             or (p.refundedAt >= :start and p.refundedAt < :end))
        and (:branchId is null or r.branch.branchId = :branchId)
      order by b.id
      """)
  List<Booking> findStaffCashMovements(
      @Param("staffId") Long staffId,
      @Param("branchId") Long branchId,
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end);

  /**
   * ID các đơn mới nhất (theo createdAt) trong phạm vi, để tải chi tiết bằng findDetailedByIdIn.
   */
  @Query(
      """
      select b.id from Booking b
        join b.showtime s
        join s.room r
        left join b.staffUser su
      where (:branchId is null or r.branch.branchId = :branchId)
        and (:staffId is null or su.id = :staffId)
      order by b.createdAt desc nulls last, b.id desc
      """)
  List<Long> findRecentIds(
      @Param("branchId") Long branchId, @Param("staffId") Long staffId, Pageable pageable);

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
  @Query("select b from Booking b where b.id in :ids")
  List<Booking> findDetailedByIdIn(@Param("ids") Collection<Long> ids);

  /**
   * {@code limit} đơn mới nhất trong phạm vi, kèm chi tiết. Tách hai bước vì giới hạn số dòng cùng
   * fetch collection sẽ khiến Hibernate tải hết rồi cắt trong bộ nhớ.
   */
  default List<Booking> findRecent(Long branchId, Long staffId, int limit) {
    List<Long> ids = findRecentIds(branchId, staffId, PageRequest.of(0, limit));
    if (ids.isEmpty()) {
      return List.of();
    }
    Map<Long, Booking> byId =
        findDetailedByIdIn(ids).stream()
            .collect(Collectors.toMap(Booking::getId, Function.identity()));
    return ids.stream().map(byId::get).filter(Objects::nonNull).toList();
  }

  @Query(
      """
      select count(b) from Booking b
        join b.showtime s
        join s.room r
      where b.status = :status
        and (:branchId is null or r.branch.branchId = :branchId)
      """)
  long countByStatusInBranch(
      @Param("status") BookingStatus status, @Param("branchId") Long branchId);

  @Query(
      """
      select count(b) from Booking b
        join b.showtime s
        join s.room r
      where b.status = :status
        and b.createdAt >= :start
        and b.createdAt < :end
        and (:branchId is null or r.branch.branchId = :branchId)
      """)
  long countByStatusCreatedBetween(
      @Param("status") BookingStatus status,
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end,
      @Param("branchId") Long branchId);

  /** Tổng tiền đã hoàn của đơn REFUNDED có refundedAt trong [start, end). */
  @Query(
      """
      select coalesce(sum(p.refundAmount), 0) from Booking b
        join b.payment p
        join b.showtime s
        join s.room r
      where b.status = com.ltweb.backend.enums.BookingStatus.REFUNDED
        and p.refundedAt >= :start
        and p.refundedAt < :end
        and (:branchId is null or r.branch.branchId = :branchId)
      """)
  BigDecimal sumRefundedAmount(
      @Param("start") LocalDateTime start,
      @Param("end") LocalDateTime end,
      @Param("branchId") Long branchId);

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
