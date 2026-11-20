package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.UpdateBookingRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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
  private final BookingMapper bookingMapper;
  private final NotificationService notificationService;
  private final BookingReleaseService bookingReleaseService;
  private final PromotionService promotionService;

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
    if (booking.getPayment().getPaymentStatus() == PaymentStatus.PENDING) {
      booking.getPayment().setPaymentStatus(PaymentStatus.CANCELLED);
    }
    // Trả ghế, tồn bắp nước và lượt khuyến mãi đã giữ.
    bookingReleaseService.releaseUnpaid(booking);
    bookingRepository.save(booking);

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
    // Đổi mã: trả lượt của mã cũ rồi giữ lượt mã mới. Lỗi giữ lượt sẽ rollback cả việc trả lượt.
    bookingReleaseService.releasePromotionUsage(booking);
    if (StringUtils.hasText(price.promotionCode())) {
      promotionService.reserveUsage(price.promotionCode());
      booking.setPromotionUsageReserved(true);
    }
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
