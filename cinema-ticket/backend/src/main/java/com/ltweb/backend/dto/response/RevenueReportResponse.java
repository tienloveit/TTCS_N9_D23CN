package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueReportResponse {
    private LocalDate fromDate;
    private LocalDate toDate;
    private Summary summary;
    private List<Row> rows;
    private List<Breakdown> branchBreakdown;
    private List<Breakdown> movieBreakdown;
    private List<Breakdown> staffBreakdown;
    private List<PaymentBreakdown> paymentBreakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private BigDecimal revenue;
        private BigDecimal ticketRevenue;
        private BigDecimal foodRevenue;
        private long bookings;
        private long ticketsSold;
        private BigDecimal averageOrderValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Row {
        private Long bookingId;
        private String bookingCode;
        private String branchName;
        private String movieName;
        private String staffUsername;
        private PaymentMethod paymentMethod;
        private BigDecimal totalAmount;
        private BigDecimal ticketAmount;
        private BigDecimal foodAmount;
        private long ticketsSold;
        private java.time.LocalDateTime paidAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Breakdown {
        private Long id;
        private String name;
        private BigDecimal revenue;
        private long bookings;
        private long ticketsSold;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentBreakdown {
        private PaymentMethod paymentMethod;
        private BigDecimal revenue;
        private long bookings;
    }
}
