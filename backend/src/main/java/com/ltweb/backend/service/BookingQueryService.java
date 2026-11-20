package com.ltweb.backend.service;

import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookingQueryService {
  private final BookingRepository bookingRepository;
  private final BookingMapper bookingMapper;
  private final CurrentUserProvider currentUserProvider;
  private final BookingAccessPolicy bookingAccessPolicy;
  private final RefundPolicy refundPolicy;

  public List<BookingResponse> getAllBookings() {
    return scopedBookings(null).stream().map(bookingMapper::toBookingResponse).toList();
  }

  public List<BookingResponse> getRefundBookings() {
    return scopedBookings(REFUND_STATUSES).stream()
        .sorted(
            java.util.Comparator.comparing(
                    Booking::getUpdatedAt,
                    java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                .reversed())
        .map(bookingMapper::toBookingResponse)
        .toList();
  }

  public BookingResponse getBookingById(Long bookingId) {
    Booking booking = getBooking(bookingId);
    bookingAccessPolicy.requireCanView(booking, getUserCurrent());
    return withRefundDeadline(booking, getRefundWindowHours());
  }

  public BookingResponse getMyBookings(Long bookingId) {
    User user = getUserCurrent();

    Booking booking = getBooking(bookingId);

    bookingAccessPolicy.requireOwner(booking, user);

    return withRefundDeadline(booking, getRefundWindowHours());
  }

  public List<BookingResponse> getMyBookingsList() {
    User user = getUserCurrent();
    int refundWindowHours = getRefundWindowHours();

    return bookingRepository.findByUserId(user.getId()).stream()
        .map(booking -> withRefundDeadline(booking, refundWindowHours))
        .toList();
  }

  private BookingResponse withRefundDeadline(Booking booking, int refundWindowHours) {
    BookingResponse response = bookingMapper.toBookingResponse(booking);
    response.setRefundDeadline(refundPolicy.deadline(booking, refundWindowHours));
    return response;
  }

  private static final List<BookingStatus> REFUND_STATUSES =
      List.of(BookingStatus.REFUND_REQUESTED, BookingStatus.REFUNDED);

  /**
   * ADMIN thấy toàn hệ thống; STAFF/MANAGER chỉ thấy chi nhánh được phân công; vai trò khác không
   * thấy gì. Lọc chi nhánh và trạng thái ngay trong truy vấn DB.
   */
  private List<Booking> scopedBookings(List<BookingStatus> statuses) {
    User currentUser = getUserCurrent();
    if (currentUser.getRole() == UserRole.ADMIN) {
      return statuses == null
          ? bookingRepository.findAll()
          : bookingRepository.findByStatusIn(statuses);
    }
    Long branchId = isBranchOperator(currentUser) ? currentUser.getBranchId() : null;
    if (branchId == null) {
      return List.of();
    }
    return statuses == null
        ? bookingRepository.findByBranchId(branchId)
        : bookingRepository.findByBranchIdAndStatusIn(branchId, statuses);
  }

  private boolean isBranchOperator(User user) {
    return bookingAccessPolicy.isBranchOperator(user);
  }

  private Booking getBooking(Long bookingId) {
    return bookingRepository
        .findById(bookingId)
        .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
  }

  private User getUserCurrent() {
    return currentUserProvider.requireUser();
  }

  private int getRefundWindowHours() {
    return refundPolicy.windowHours();
  }
}
