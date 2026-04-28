package com.ltweb.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TicketCheckInResponse {
  private Long bookingId;
  private String bookingCode;
  private String customerName;
  private String movieName;
  private String branchName;
  private String roomName;
  private LocalDateTime showtimeStart;
  private List<TicketCheckInItemResponse> tickets;
  private String message;
}
