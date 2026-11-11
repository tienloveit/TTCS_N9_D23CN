package com.ltweb.backend.job;

import com.ltweb.backend.dto.response.SeatStatusEvent;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.service.BookingTransactionEffects;
import com.ltweb.backend.service.FoodStockService;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.TicketRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
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
    private final RedisTemplate<String, String> redisTemplate;
    private final FoodStockService foodStockService;

    /**
     * Chạy mỗi 2 phút để quét và giải phóng các booking PENDING đã hết hạn. Xử lý
     * trường hợp người
     * dùng bỏ qua thanh toán mà không có IPN callback từ VNPay.
     */
    @Scheduled(fixedRate = 120_000)
    @Transactional
    public void releaseExpiredBookings() {
        List<Long> expiredBookings = bookingRepository.findExpiredBookingIds(LocalDateTime.now());

        if (expiredBookings.isEmpty()) {
            return;
        }

        log.info(
                "[BookingCleanupJob] Tìm thấy {} booking hết hạn, đang giải phóng...",
                expiredBookings.size());

        for (Long bookingId : expiredBookings) {
            Booking booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
            if (booking == null || booking.getStatus() != BookingStatus.PENDING
                    || booking.getPayment() == null || booking.getPayment().getPaymentStatus() != PaymentStatus.PENDING
                    || booking.getExpiresAt() == null || booking.getExpiresAt().isAfter(LocalDateTime.now())) {
                continue;
            }
            booking.setStatus(BookingStatus.CANCELLED);
            booking.getPayment().setPaymentStatus(PaymentStatus.CANCELLED);
            for (var ticket : booking.getTickets()) {
                ticket.setBooking(null);
                ticket.setTicketStatus(TicketStatus.AVAILABLE);
                ticket.setQrCode(null);
                ticket.setCheckedInAt(null);
                ticket.setCheckedInBy(null);
                ticketRepository.save(ticket);
                BookingTransactionEffects.afterCommit(() -> simpMessagingTemplate.convertAndSend(
                        "/topic/showtime/" + ticket.getShowtime().getId() + "/seats",
                        SeatStatusEvent.builder().seatId(ticket.getSeat().getId()).status("AVAILABLE").build()));
            }
            bookingRepository.save(booking);
            foodStockService.release(booking);
            BookingTransactionEffects.releaseAfterCommit(redisTemplate, booking.getShowtime().getId(),
                    booking.getTickets(), booking.getBookingCode());
            log.info("Expired booking released: {}", booking.getBookingCode());
        }
    }
}
