package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.SeatType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SeatResponse {

  private Long seatId;

  private Long roomId;

  private String seatCode;

  private String rowLabel;

  private Integer seatNumber;

  private SeatType seatType;

  private Boolean isActive;
}
