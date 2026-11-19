package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.UpdateBookingRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.dto.response.SeatStatusEvent;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.TicketRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BookingCommandService {
  private final CurrentUserProvider currentUserProvider;
  private final BookingAccessPolicy bookingAccessPolicy;
  private final RefundPolicy refundPolicy;
  private final BookingPricingService bookingPricingService;
  private final java.time.Clock clock;
  private final BookingRepository bookingRepository;
  private final TicketRepository ticketRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final SimpMessagingTemplate simpMessagingTemplate;
  private final BookingMapper bookingMapper;
  private final NotificationService notificationService;
  private final FoodStockService foodStockService;

  @Transactional
  public BookingResponse updateBooking(Long bookingId, UpdateBookingRequest request) {
    Booking booking = getBookingForUpdate(bookingId);
    requireBookingManagementAccess(booking);

    if (request.getStatus() == BookingStatus.CANCELLED) {
      cancelBooking(bookingId);
    } else if (request.getStatus() != null && request.getStatus() != booking.getStatus()) {
      throw new AppException(ErrorCode.INVALID_PAYMENT_STATUS);
    }

    return bookingMapper.toBookingResponse(bookingRepository.save(booking));
  }

  @Transactional
  public void cancelBooking(Long bookingId) {
    Booking booking = getBookingForUpdate(bookingId);
    User user = getUserCurrent();
    bookingAccessPolicy.requireCanCancel(booking, user);

    // Chỉ cho phép huỷ khi trạng thái PENDING (đang chờ thanh toán)
    if (booking.getStatus() != BookingStatus.PENDING) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_CANCEL);
    }

    booking.setStatus(BookingStatus.CANCELLED);
    bookingRepository.save(booking);
    foodStockService.release(booking);

    // Trả trạng thái của vé về AVAILABLE
    booking
        .getTickets()
        .forEach(
            ticket -> {
              ticket.setBooking(null); // huỷ connect với booking
              ticket.setTicketStatus(TicketStatus.AVAILABLE);
              ticket.setQrCode(null);
              ticket.setCheckedInAt(null);
              ticket.setCheckedInBy(null);
              ticketRepository.save(ticket);

              BookingTransactionEffects.afterCommit(
                  () ->
                      simpMessagingTemplate.convertAndSend(
                          "/topic/showtime/" + booking.getShowtime().getId() + "/seats",
                          SeatStatusEvent.builder()
                              .seatId(ticket.getSeat().getId())
                              .status("AVAILABLE")
                              .build()));
            });

    BookingTransactionEffects.releaseAfterCommit(
        redisTemplate,
        booking.getShowtime().getId(),
        booking.getTickets(),
        booking.getBookingCode()); // chủ động huỷ

    if (booking.getPayment().getPaymentStatus() == PaymentStatus.PENDING) {
      booking.getPayment().setPaymentStatus(PaymentStatus.CANCELLED);
      bookingRepository.save(booking);
    }

    log.info("Booking cancelled: {}", bookingId);
  }

  public BookingResponse applyPromotion(Long bookingId, String promotionCode) {
    Booking booking = getBookingForUpdate(bookingId);
    User user = getUserCurrent();

    // Chỉ chủ booking mới được áp mã
    bookingAccessPolicy.requireOwner(booking, user);

    // Chỉ áp dụng cho booking PENDING (chưa thanh toán)
    if (booking.getStatus() != BookingStatus.PENDING
        || booking.getPayment() == null
        || booking.getPayment().getPaymentStatus() != PaymentStatus.PENDING
        // An issued VNPay URL must retain the amount signed for that payment.
        || booking.getPayment().getPaymentMethod() == PaymentMethod.VNPAY
        || booking.getExpiresAt() == null
        || !booking.getExpiresAt().isAfter(LocalDateTime.now(clock))) {
      throw new AppException(ErrorCode.INVALID_PAYMENT_STATUS);
    }

    // Tính lại giá gốc (cộng lại discount cũ nếu có)
    BigDecimal originalAmount =
        booking
            .getTotalAmount()
            .add(
                booking.getDiscountAmount() != null
                    ? booking.getDiscountAmount()
                    : BigDecimal.ZERO);

    BookingPricingService.Price price =
        bookingPricingService.discount(
            originalAmount,
            BigDecimal.ZERO,
            promotionCode,
            user.getId(),
            bookingAccessPolicy.branchId(booking));
    booking.setPromotionCode(price.promotionCode());
    booking.setDiscountAmount(price.discountAmount());
    booking.setTotalAmount(price.totalAmount());

    booking.getPayment().setAmount(booking.getTotalAmount());
    bookingRepository.save(booking);
    log.info("Promotion {} applied to booking {}", promotionCode, bookingId);
    return bookingMapper.toBookingResponse(booking);
  }

  public BookingResponse requestRefund(Long bookingId, String reason) {
    Booking booking = getBookingForUpdate(bookingId);
    User user = getUserCurrent();

    // Chỉ chủ booking mới được yêu cầu hoàn tiền
    bookingAccessPolicy.requireOwner(booking, user);

    refundPolicy.requireCanRequest(booking);

    booking.setStatus(BookingStatus.REFUND_REQUESTED);
    booking.getPayment().setRefundReason(reason);
    booking.getPayment().setRefundAmount(booking.getTotalAmount());
    bookingRepository.save(booking);
    notificationService.notifyRefundRequest(
        getBookingBranchId(booking), booking.getId(), booking.getBookingCode());

    log.info("Refund requested for booking {}: reason={}", bookingId, reason);
    return bookingMapper.toBookingResponse(booking);
  }

  private Booking getBookingForUpdate(Long bookingId) {
    return bookingRepository
        .findByIdForUpdate(bookingId)
        .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
  }

  private User getUserCurrent() {
    return currentUserProvider.requireUser();
  }

  private Long getBookingBranchId(Booking booking) {
    return bookingAccessPolicy.branchId(booking);
  }

  private void requireBookingManagementAccess(Booking booking) {
    bookingAccessPolicy.requireCanManage(booking, getUserCurrent());
  }
}
