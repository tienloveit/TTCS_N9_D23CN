package com.cgvptit.movie.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimeRequestDTO {

    @NotNull(message = "movieId không được để trống")
    private Integer movieId;

    @NotNull(message = "roomId không được để trống")
    private Integer roomId;

    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalDateTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalDateTime endTime;

    @NotNull(message = "Giá vé không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá vé phải lớn hơn 0")
    private BigDecimal price;
}
