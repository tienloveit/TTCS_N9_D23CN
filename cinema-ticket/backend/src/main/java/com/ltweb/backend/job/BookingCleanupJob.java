package com.ltweb.backend.job;

import com.ltweb.backend.dto.response.SeatStatusEvent;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.TicketRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingCleanupJob {

  private final BookingRepository bookingRepository;
  private final TicketRepository ticketRepository;
  private final SimpMessagingTemplate simpMessagingTemplate;

  /**
   * Chạy mỗi 2 phút để quét và giải phóng các booking PENDING đã hết hạn. Xử lý trường hợp người
   * dùng bỏ qua thanh toán mà không có IPN callback từ VNPay.
   */
  @Scheduled(fixedRate = 120_000)
  @Transactional
  public void releaseExpiredBookings() {
    List<Booking> expiredBookings =
        bookingRepository.findByStatusAndExpiresAtBefore(
            BookingStatus.PENDING, LocalDateTime.now());

    if (expiredBookings.isEmpty()) {
      return;
    }

    log.info(
        "[BookingCleanupJob] Tìm thấy {} booking hết hạn, đang giải phóng...",
        expiredBookings.size());

    for (Booking booking : expiredBookings) {
      try {
        // Cập nhật trạng thái booking
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setPaymentStatus(PaymentStatus.CANCELLED);

        // Giải phóng từng vé và broadcast real-time qua WebSocket
        booking
            .getTickets()
            .forEach(
                ticket -> {
                  ticket.setBooking(null);
                  ticket.setTicketStatus(TicketStatus.AVAILABLE);
                  ticketRepository.save(ticket);

                  simpMessagingTemplate.convertAndSend(
                      "/topic/showtime/" + booking.getShowtime().getId() + "/seats",
                      SeatStatusEvent.builder()
                          .seatId(ticket.getSeat().getId())
                          .status("AVAILABLE")
                          .build());
                });

        bookingRepository.save(booking);
        log.info("[BookingCleanupJob] Đã giải phóng booking: {}", booking.getBookingCode());

      } catch (Exception e) {
        log.error(
            "[BookingCleanupJob] Lỗi khi giải phóng booking {}: {}",
            booking.getBookingCode(),
            e.getMessage());
      }
    }
  }
}
