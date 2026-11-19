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
    User user = booking.getUser();
    if (user == null) return;

    BigDecimal currentSpending =
        user.getTotalSpending() != null ? user.getTotalSpending() : BigDecimal.ZERO;
    user.setTotalSpending(currentSpending.add(booking.getTotalAmount()));
    user.setMembershipTier(
        com.ltweb.backend.enums.MembershipTier.fromSpending(user.getTotalSpending()));
    userRepository.save(user);

    // Tăng usedCount của promotion nếu có
    if (booking.getPromotionCode() != null) {
      promotionService.incrementUsage(booking.getPromotionCode());
    }

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
