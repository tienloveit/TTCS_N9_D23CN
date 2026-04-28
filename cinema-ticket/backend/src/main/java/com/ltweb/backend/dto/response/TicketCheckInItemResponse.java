package com.ltweb.backend.dto.response;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TicketCheckInItemResponse {
  private Long ticketId;
  private String seatCode;
  private String qrCode;
  private boolean checkedIn;
  private boolean alreadyCheckedIn;
  private LocalDateTime checkedInAt;
}
