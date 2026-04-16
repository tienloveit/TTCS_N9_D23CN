package com.cgvptit.movie.dto.request;

import com.cgvptit.movie.enums.SeatType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatTypeUpdateDTO {
    @NotNull(message = "Loại ghế không được để trống")
    private SeatType seatType;
}
