package com.ltweb.backend.repository;

import java.math.BigDecimal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Tìm đơn quản lý theo bộ lọc động, phân trang ở DB. */
public interface BookingSearchRepository {

  /** ID đơn khớp bộ lọc, mới nhất trước (createdAt giảm dần, rồi id giảm dần). */
  Page<Long> searchIds(BookingSearchFilter filter, Pageable pageable);

  /** Thống kê trên toàn bộ đơn khớp bộ lọc, không chỉ trang hiện tại. */
  Totals totals(BookingSearchFilter filter);

  record Totals(long completed, long refundRequested, BigDecimal paidAmount) {}
}
