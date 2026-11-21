package com.ltweb.backend.job;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.service.BookingReleaseService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Slf4j
@Component
public class BookingCleanupJob {

  private final Clock clock;
  private final BookingRepository bookingRepository;
  private final BookingReleaseService bookingReleaseService;
  private final TransactionTemplate perBooking;

  public BookingCleanupJob(
      Clock clock,
      BookingRepository bookingRepository,
      BookingReleaseService bookingReleaseService,
      PlatformTransactionManager transactionManager) {
    this.clock = clock;
    this.bookingRepository = bookingRepository;
    this.bookingReleaseService = bookingReleaseService;
    this.perBooking = new TransactionTemplate(transactionManager);
    this.perBooking.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  /**
   * Chạy mỗi 2 phút để giải phóng các booking PENDING đã hết hạn (người dùng bỏ thanh toán, không
   * có IPN). Mỗi đơn chạy trong transaction riêng: một đơn lỗi không chặn các đơn còn lại, và khóa
   * chỉ giữ trong thời gian xử lý một đơn.
   */
  @Scheduled(fixedRate = 120_000)
  public void releaseExpiredBookings() {
    List<Long> expiredBookings = bookingRepository.findExpiredBookingIds(LocalDateTime.now(clock));
    if (expiredBookings.isEmpty()) {
      return;
    }

    log.info(
        "[BookingCleanupJob] Tìm thấy {} booking hết hạn, đang giải phóng...",
        expiredBookings.size());

    int released = 0;
    for (Long bookingId : expiredBookings) {
      try {
        Boolean done = perBooking.execute(status -> releaseIfExpired(bookingId));
        if (Boolean.TRUE.equals(done)) released++;
      } catch (RuntimeException failure) {
        log.error("[BookingCleanupJob] Không giải phóng được booking {}", bookingId, failure);
      }
    }
    log.info("[BookingCleanupJob] Đã giải phóng {}/{} booking", released, expiredBookings.size());
  }

  /** Khóa và kiểm tra lại đơn trong transaction hiện tại; trả true nếu đơn được giải phóng. */
  boolean releaseIfExpired(Long bookingId) {
    Booking booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
    if (booking == null
        || booking.getStatus() != BookingStatus.PENDING
        || booking.getPayment() == null
        || booking.getPayment().getPaymentStatus() != PaymentStatus.PENDING
        || booking.getExpiresAt() == null
        || booking.getExpiresAt().isAfter(LocalDateTime.now(clock))) {
      return false;
    }
    booking.setStatus(BookingStatus.CANCELLED);
    booking.getPayment().setPaymentStatus(PaymentStatus.CANCELLED);
    bookingReleaseService.releaseUnpaid(booking);
    bookingRepository.save(booking);
    log.info("Expired booking released: {}", booking.getBookingCode());
    return true;
  }
}
