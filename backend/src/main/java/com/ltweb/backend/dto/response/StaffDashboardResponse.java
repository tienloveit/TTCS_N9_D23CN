package com.ltweb.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StaffDashboardResponse {
  private Summary summary;
  private List<UpcomingShowtime> upcomingShowtimes;
  private List<BookingResponse> recentBookings;

  @Data
  @Builder
  public static class Summary {
    private BigDecimal revenue;
    private BigDecimal cashRevenue;
    private BigDecimal cardRevenue;
    private BigDecimal foodRevenue;
    private long paidBookings;
    private long pendingBookings;
    private long ticketsSold;
    private long checkedInTickets;
    private long refundRequests;

    // Đối soát két tiền mặt hôm nay, theo các đơn nhân viên này bán.
    /** Tiền mặt đã thu: mọi đơn tiền mặt thanh toán hôm nay, kể cả đơn sau đó được hoàn. */
    private BigDecimal cashCollected;

    private long cashSales;

    /**
     * Tiền mặt đã trả lại hôm nay cho đơn tiền mặt được duyệt hoàn (có thể là đơn bán hôm trước).
     */
    private BigDecimal cashRefunded;

    private long cashRefunds;

    /** Tiền mặt bán vé phải có trong két = đã thu − đã hoàn (chưa gồm tiền lẻ đầu ca). */
    private BigDecimal cashExpected;
  }

  @Data
  @Builder
  public static class UpcomingShowtime {
    private Long showtimeId;
    private String movieName;
    private String roomName;
    private String branchName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private int availableSeats;
    private int totalSeats;
  }
}
