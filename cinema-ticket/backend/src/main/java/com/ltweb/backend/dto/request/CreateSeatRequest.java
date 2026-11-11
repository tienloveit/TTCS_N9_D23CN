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

    @jakarta.validation.constraints.NotBlank(message = "SeatCode is required")
    @jakarta.validation.constraints.Size(max = 255)
    private String seatCode;

    private String rowLabel;

    private Integer seatNumber;

    private SeatType seatType;

}
