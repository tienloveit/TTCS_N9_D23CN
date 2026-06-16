package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.StaffShiftStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationsReportResponse {
    private LocalDate reportDate;
    private Long branchId;
    private String branchName;
    private Summary summary;
    private List<PaymentBreakdown> paymentBreakdown;
    private List<StaffShiftRow> staffShifts;
    private List<LowStockFood> lowStockFoods;
    private List<RefundQueueItem> refundQueue;
    private List<ShowtimeLoad> showtimeLoads;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private BigDecimal revenue;
        private BigDecimal ticketRevenue;
        private BigDecimal foodRevenue;
        private BigDecimal refundedAmount;
        private long completedBookings;
        private long pendingBookings;
        private long refundRequests;
        private long ticketsSold;
        private long showtimes;
        private long totalCapacity;
        private double occupancyRate;
        private long lowStockItems;
        private BigDecimal expectedCash;
        private BigDecimal cashDifference;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentBreakdown {
        private PaymentMethod paymentMethod;
        private BigDecimal amount;
        private long bookings;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffShiftRow {
        private Long shiftId;
        private Long staffId;
        private String staffName;
        private StaffShiftStatus status;
        private LocalDateTime openedAt;
        private LocalDateTime closedAt;
        private BigDecimal openingCash;
        private BigDecimal closingCash;
        private BigDecimal expectedCash;
        private BigDecimal cashDifference;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockFood {
        private Long foodId;
        private String foodName;
        private Long branchId;
        private Integer stockQuantity;
        private Integer lowStockThreshold;
        private Boolean active;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RefundQueueItem {
        private Long bookingId;
        private String bookingCode;
        private String customerName;
        private BigDecimal amount;
        private String reason;
        private BookingStatus status;
        private LocalDateTime paidAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShowtimeLoad {
        private Long showtimeId;
        private String movieName;
        private String roomName;
        private LocalDateTime startTime;
        private long capacity;
        private long ticketsSold;
        private double occupancyRate;
    }
}
