package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.TicketStatus;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class UpdateTicketRequest {

  private BigDecimal price;

  private TicketStatus ticketStatus;

  private Long showtimeId;

  private Long seatId;

  private Long bookingId;

  private String qrCode;
}
