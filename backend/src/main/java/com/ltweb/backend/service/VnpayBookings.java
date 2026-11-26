package com.ltweb.backend.service;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.ShowtimeStatus;
import com.ltweb.backend.repository.BookingRepository;
import java.time.LocalDateTime;
import java.util.Optional;

/** Quy tắc tìm và kiểm đơn dùng chung cho lúc tạo URL thanh toán và lúc nhận callback VNPay. */
final class VnpayBookings {
  private VnpayBookings() {}

  /** Đơn khớp vnp_TxnRef (id đơn; giao dịch cũ dùng mã đơn), khóa để ghi. */
  static Optional<Booking> findByTxnRef(BookingRepository bookingRepository, String txnRef) {
    try {
      Optional<Booking> bookingOpt = bookingRepository.findByIdForUpdate(Long.valueOf(txnRef));
      if (bookingOpt.isPresent()) {
        return bookingOpt;
      }
    } catch (NumberFormatException e) {
    }
    return bookingRepository.findByBookingCodeForUpdate(txnRef);
  }

  /** Suất của đơn đã bị hủy: không nhận thanh toán và không xuất vé cho đơn này nữa. */
  static boolean isShowtimeCancelled(Booking booking) {
    return booking.getShowtime() != null
        && booking.getShowtime().getStatus() == ShowtimeStatus.CANCELLED;
  }

  /** Đơn còn chờ thanh toán và chưa hết hạn giữ ghế tại thời điểm {@code now}. */
  static boolean isPendingPayment(Booking booking, LocalDateTime now) {
    return booking.getStatus() == BookingStatus.PENDING
        && booking.getPayment() != null
        && booking.getPayment().getPaymentStatus() == PaymentStatus.PENDING
        && booking.getExpiresAt() != null
        && booking.getExpiresAt().isAfter(now);
  }
}
