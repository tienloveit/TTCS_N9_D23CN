package com.ltweb.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class SeatStatusEvent {

  private Long seatId;
  private String status; // AVAILABLE, HOLDING, BOOKED
}
