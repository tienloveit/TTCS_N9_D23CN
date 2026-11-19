package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateBookingRequest;
import com.ltweb.backend.dto.request.StaffBookingRequest;
import com.ltweb.backend.dto.request.UpdateBookingRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BookingService {
  private final BookingCheckoutService bookingCheckoutService;
  private final BookingCommandService bookingCommandService;
  private final BookingQueryService bookingQueryService;
  private final BookingMembershipService bookingMembershipService;
  private final BookingRefundService bookingRefundService;

  @Transactional
  public BookingResponse createBooking(CreateBookingRequest request) {
    return bookingCheckoutService.createBooking(request);
  }

  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  @Transactional
  public BookingResponse createStaffBooking(StaffBookingRequest request) {
    return bookingCheckoutService.createStaffBooking(request);
  }

  @PreAuthorize("hasAnyRole('ADMIN','STAFF','MANAGER')")
  @Transactional(readOnly = true)
  public List<BookingResponse> getAllBookings() {
    return bookingQueryService.getAllBookings();
  }

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  @Transactional(readOnly = true)
  public List<BookingResponse> getRefundBookings() {
    return bookingQueryService.getRefundBookings();
  }

  @Transactional(readOnly = true)
  public BookingResponse getBookingById(Long bookingId) {
    return bookingQueryService.getBookingById(bookingId);
  }

  @Transactional(readOnly = true)
  public BookingResponse getMyBookings(Long bookingId) {
    return bookingQueryService.getMyBookings(bookingId);
  }

  @Transactional(readOnly = true)
  public List<BookingResponse> getMyBookingsList() {
    return bookingQueryService.getMyBookingsList();
  }

  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  @Transactional
  public BookingResponse updateBooking(Long bookingId, UpdateBookingRequest request) {
    return bookingCommandService.updateBooking(bookingId, request);
  }

  @Transactional
  public void cancelBooking(Long bookingId) {
    bookingCommandService.cancelBooking(bookingId);
  }

  /**
   * Áp dụng hoặc xóa mã khuyến mại cho booking đang PENDING. Tính lại totalAmount từ giá gốc (trước
   * giảm giá) để tránh stacking discount.
   */
  @Transactional
  public BookingResponse applyPromotion(Long bookingId, String promotionCode) {
    return bookingCommandService.applyPromotion(bookingId, promotionCode);
  }

  /** Cộng tổng chi tiêu và nâng hạng thành viên sau khi thanh toán thành công. */
  @Transactional
  public void updateMembershipAfterPayment(Long bookingId) {
    bookingMembershipService.updateMembershipAfterPayment(bookingId);
  }

  /**
   * User yêu cầu hoàn tiền. Thời hạn lấy từ cấu hình refund.windowHours, booking phải ở trạng thái
   * COMPLETED.
   */
  @Transactional
  public BookingResponse requestRefund(Long bookingId, String reason) {
    return bookingCommandService.requestRefund(bookingId, reason);
  }

  /** Admin/Manager duyệt hoặc từ chối yêu cầu hoàn tiền. */
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public BookingResponse processRefund(Long bookingId, boolean approved) {
    return processRefund(bookingId, approved, null);
  }

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public BookingResponse processRefund(Long bookingId, boolean approved, String note) {
    return bookingRefundService.processRefund(bookingId, approved, note);
  }
}
