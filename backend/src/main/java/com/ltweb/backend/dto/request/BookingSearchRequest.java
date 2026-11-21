package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.BookingStatus;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

/**
 * Tham số query của {@code GET /booking/search}. Ngày tính theo giờ rạp và gồm cả hai đầu.
 *
 * @param q mã đơn, tài khoản khách, phim, chi nhánh, mã ghế hoặc mã vé
 * @param paymentStatus tên {@code PaymentStatus} hoặc {@code NO_TRANSACTION}
 * @param from ngày đặt từ
 * @param to ngày đặt đến
 * @param showtimeDate ngày chiếu
 * @param checkedInDate ngày có vé được soát
 * @param page trang, bắt đầu từ 0
 * @param size số đơn mỗi trang, tối đa {@link #MAX_SIZE}
 */
public record BookingSearchRequest(
    String q,
    BookingStatus status,
    String paymentStatus,
    Long branchId,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate showtimeDate,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkedInDate,
    Integer page,
    Integer size) {
  public static final int DEFAULT_SIZE = 15;
  public static final int MAX_SIZE = 100;
  public static final String NO_TRANSACTION = "NO_TRANSACTION";

  public int pageOrDefault() {
    return page == null ? 0 : Math.max(page, 0);
  }

  public int sizeOrDefault() {
    return size == null ? DEFAULT_SIZE : Math.min(Math.max(size, 1), MAX_SIZE);
  }
}
