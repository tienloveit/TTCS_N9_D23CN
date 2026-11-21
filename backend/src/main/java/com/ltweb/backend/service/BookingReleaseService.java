package com.ltweb.backend.service;

import com.ltweb.backend.dto.response.SeatStatusEvent;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.repository.TicketRepository;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Một nơi duy nhất trả lại tài nguyên mà đơn đang giữ. Gọi trong transaction đã khóa booking; các
 * thông báo ghế và việc nhả khóa Redis chỉ chạy sau khi transaction commit.
 */
@Service
@RequiredArgsConstructor
public class BookingReleaseService {
  private final TicketRepository ticketRepository;
  private final SimpMessagingTemplate simpMessagingTemplate;
  private final RedisTemplate<String, String> redisTemplate;
  private final FoodStockService foodStockService;
  private final PromotionService promotionService;

  /** Trả các vé của đơn về AVAILABLE, phát trạng thái ghế và nhả khóa giữ ghế sau commit. */
  public void releaseSeats(Booking booking) {
    Long showtimeId = booking.getShowtime().getId();
    List<Ticket> owned =
        booking.getTickets().stream()
            .filter(
                ticket ->
                    ticket.getBooking() == null
                        || Objects.equals(ticket.getBooking().getId(), booking.getId()))
            .toList();
    for (Ticket ticket : owned) {
      ticket.setBooking(null);
      ticket.setTicketStatus(TicketStatus.AVAILABLE);
      ticket.setQrCode(null);
      ticket.setCheckedInAt(null);
      ticket.setCheckedInBy(null);
      ticketRepository.save(ticket);
      Long seatId = ticket.getSeat().getId();
      BookingTransactionEffects.afterCommit(
          () ->
              simpMessagingTemplate.convertAndSend(
                  "/topic/showtime/" + showtimeId + "/seats",
                  SeatStatusEvent.builder().seatId(seatId).status("AVAILABLE").build()));
    }
    BookingTransactionEffects.releaseAfterCommit(
        redisTemplate, showtimeId, owned, booking.getBookingCode());
  }

  /**
   * Đơn kết thúc mà không được thanh toán (hủy, hết hạn, VNPay báo thất bại, thanh toán đến trễ):
   * trả ghế, hoàn tồn bắp nước và trả lượt khuyến mãi đã giữ.
   */
  public void releaseUnpaid(Booking booking) {
    releaseSeats(booking);
    foodStockService.release(booking);
    releasePromotionUsage(booking);
  }

  /** Trả lượt khuyến mãi nếu đơn đã giữ lượt lúc tạo/áp mã. Gọi nhiều lần vẫn an toàn. */
  public void releasePromotionUsage(Booking booking) {
    if (Boolean.TRUE.equals(booking.getPromotionUsageReserved())
        && StringUtils.hasText(booking.getPromotionCode())) {
      promotionService.releaseUsage(booking.getPromotionCode());
    }
    if (Boolean.TRUE.equals(booking.getPromotionUsageReserved())) {
      booking.setPromotionUsageReserved(false);
    }
  }
}
