package com.ltweb.backend.dto.response;

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
public class AdminAnalyticsResponse {
    private LocalDate fromDate;
    private LocalDate toDate;
    private Summary summary;
    private List<DailyRevenue> revenueTrend;
    private List<TopMovie> topMovies;
    private List<FoodSale> foodSales;
    private List<Occupancy> occupancyByBranch;
    private List<BookingResponse> recentBookings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private BigDecimal revenue;
        private BigDecimal ticketRevenue;
        private BigDecimal foodRevenue;
        private long paidBookings;
        private long ticketsSold;
        private long totalCapacity;
        private double occupancyRate;
        private BigDecimal averageOrderValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRevenue {
        private LocalDate date;
        private String label;
        private BigDecimal revenue;
        private long bookings;
        private long tickets;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopMovie {
        private Long movieId;
        private String movieName;
        private BigDecimal revenue;
        private long ticketsSold;
        private long showtimes;
        private long capacity;
        private double occupancyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FoodSale {
        private Long foodId;
        private String foodName;
        private long quantity;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Occupancy {
        private Long branchId;
        private String branchName;
        private long ticketsSold;
        private long capacity;
        private double occupancyRate;
    }
}
