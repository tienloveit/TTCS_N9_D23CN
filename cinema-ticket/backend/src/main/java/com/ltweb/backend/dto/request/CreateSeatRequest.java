package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.SeatType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateSeatRequest {

  @NotNull(message = "RoomId is required")
  private Long roomId;

  @NotNull(message = "SeatCode is required")
  private String seatCode;

  private String rowLabel;

  private Integer seatNumber;

  private SeatType seatType;

  private Boolean isActive;
}
