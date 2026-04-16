package com.cgvptit.movie.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomRequestDTO {

    @NotNull(message = "cinemaId không được để trống")
    private Integer cinemaId;

    @NotBlank(message = "Tên phòng chiếu không được để trống")
    private String name;

    @NotNull(message = "Số hàng ghế (rowCount) không được để trống")
    @Min(value = 1, message = "Phải có ít nhất 1 hàng ghế")
    @Max(value = 26, message = "Tối đa 26 hàng ghế (A-Z)")
    private Integer rowCount;

    @NotNull(message = "Số ghế mỗi hàng (seatPerRow) không được để trống")
    @Min(value = 1, message = "Phải có ít nhất 1 ghế mỗi hàng")
    @Max(value = 50, message = "Tối đa 50 ghế mỗi hàng")
    private Integer seatPerRow;
}
