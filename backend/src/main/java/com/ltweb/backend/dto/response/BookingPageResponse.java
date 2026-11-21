package com.ltweb.backend.dto.response;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Một trang đơn quản lý; {@code summary} tính trên toàn bộ đơn khớp bộ lọc. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingPageResponse {
  private List<BookingResponse> content;

  /** Trang hiện tại, bắt đầu từ 0. */
  private int page;

  private int size;
  private long totalElements;
  private int totalPages;
  private Summary summary;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Summary {
    private long completed;
    private long refundRequested;

    /** Tổng tiền của đơn có trạng thái thanh toán PAID. */
    private BigDecimal paidAmount;
  }
}
