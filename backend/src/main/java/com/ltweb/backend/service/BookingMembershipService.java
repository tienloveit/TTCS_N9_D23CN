package com.ltweb.backend.service;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingMembershipService {
  private final BookingRepository bookingRepository;
  private final UserRepository userRepository;
  private final PromotionService promotionService;

  @Transactional
  public void updateMembershipAfterPayment(Long bookingId) {
    Booking booking = getBooking(bookingId);
    // Chạy một lần cho mỗi đơn: sự kiện thanh toán lặp lại không cộng chi tiêu hai lần.
    if (booking.getSpendingRecorded() != null) return;
    booking.setSpendingRecorded(true);

    // Đơn cũ chưa giữ lượt lúc tạo: tính lượt khi thanh toán như trước.
    if (booking.getPromotionCode() != null
        && !Boolean.TRUE.equals(booking.getPromotionUsageReserved())) {
      promotionService.incrementUsage(booking.getPromotionCode());
    }
    // Lượt đã giữ nay trở thành lượt đã dùng; không trả lại khi hoàn tiền.
    booking.setPromotionUsageReserved(false);
    bookingRepository.save(booking);

    if (booking.getUser() == null) return;
    User user =
        userRepository
            .findByIdForUpdate(booking.getUser().getId())
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

    BigDecimal currentSpending =
        user.getTotalSpending() != null ? user.getTotalSpending() : BigDecimal.ZERO;
    user.setTotalSpending(currentSpending.add(booking.getTotalAmount()));
    user.setMembershipTier(
        com.ltweb.backend.enums.MembershipTier.fromSpending(user.getTotalSpending()));
    userRepository.save(user);

    log.info(
        "Updated membership for user {}: spending={}, tier={}",
        user.getUsername(),
        user.getTotalSpending(),
        user.getMembershipTier());
  }

  private Booking getBooking(Long bookingId) {
    return bookingRepository
        .findById(bookingId)
        .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
  }
}
