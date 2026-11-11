package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.SeatType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSeatRequest {

    @jakarta.validation.constraints.Pattern(regexp = "(?s).*\\S.*", message = "SeatCode must not be blank")
    @jakarta.validation.constraints.Size(max = 255)
    private String seatCode;

    private String rowLabel;

    private Integer seatNumber;

    private SeatType seatType;


    private Long roomId;
}
