package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.StaffShiftStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StaffShiftResponse {
  private Long shiftId;
  private Long staffId;
  private String staffUsername;
  private Long branchId;
  private BigDecimal openingCash;
  private BigDecimal closingCash;
  private BigDecimal cashSales;
  private BigDecimal cardSales;
  private BigDecimal totalSales;
  private BigDecimal expectedCash;
  private BigDecimal cashDifference;
  private long paidBookings;
  private long ticketsSold;
  private LocalDateTime openedAt;
  private LocalDateTime closedAt;
  private Long durationMinutes;
  private String note;
  private StaffShiftStatus status;
}
