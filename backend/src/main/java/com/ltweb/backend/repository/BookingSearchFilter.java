package com.ltweb.backend.repository;

import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import java.time.LocalDateTime;

/**
 * Bộ lọc danh sách đơn quản lý. Mọi trường null nghĩa là không lọc theo tiêu chí đó; khoảng thời
 * gian là [from, to). {@code noPaymentStatus} chọn đơn chưa có trạng thái thanh toán.
 *
 * @param branchId phạm vi chi nhánh đã được service xác định theo quyền
 * @param query từ khóa: mã đơn, tài khoản khách, phim, chi nhánh, mã ghế (chứa) hoặc mã vé (khớp)
 */
public record BookingSearchFilter(
    Long branchId,
    String query,
    BookingStatus status,
    PaymentStatus paymentStatus,
    boolean noPaymentStatus,
    LocalDateTime createdFrom,
    LocalDateTime createdTo,
    LocalDateTime showtimeFrom,
    LocalDateTime showtimeTo,
    LocalDateTime checkedInFrom,
    LocalDateTime checkedInTo) {

  public static BookingSearchFilter forBranch(Long branchId) {
    return new BookingSearchFilter(
        branchId, null, null, null, false, null, null, null, null, null, null);
  }
}
