package com.ltweb.backend.service;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import java.time.Clock;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefundPolicy {
  private final SystemSettingService settings;
  private final Clock clock;

  public int windowHours() {
    return Math.max(1, settings.getInt(SystemSettingService.REFUND_WINDOW_HOURS, 24));
  }

  public boolean isPaidAndUnused(Booking booking) {
    return booking.getPayment() != null
        && booking.getPayment().getPaymentStatus() == PaymentStatus.PAID
        && booking.getTickets().stream().noneMatch(ticket -> ticket.getCheckedInAt() != null);
  }

  public LocalDateTime deadline(Booking booking, int hours) {
    if (booking.getStatus() != BookingStatus.COMPLETED
        || !isPaidAndUnused(booking)
        || booking.getPayment().getPaidAt() == null) return null;
    return booking.getPayment().getPaidAt().plusHours(hours);
  }

  public void requireCanRequest(Booking booking) {
    if (booking.getStatus() == BookingStatus.REFUNDED) {
      throw new AppException(ErrorCode.BOOKING_ALREADY_REFUNDED);
    }
    LocalDateTime deadline = deadline(booking, windowHours());
    if (deadline == null) throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    if (LocalDateTime.now(clock).isAfter(deadline))
      throw new AppException(ErrorCode.REFUND_WINDOW_EXPIRED);
  }

  public void requireCanApprove(Booking booking) {
    // Approval may happen after the customer's request window has closed.
    if (booking.getStatus() != BookingStatus.REFUND_REQUESTED || !isPaidAndUnused(booking)) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    }
  }
}
