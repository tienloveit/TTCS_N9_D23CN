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
    private StaffShiftResponse activeShift;
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
