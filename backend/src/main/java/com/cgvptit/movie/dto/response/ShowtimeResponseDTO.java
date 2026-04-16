package com.cgvptit.movie.dto.response;

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
public class ShowtimeResponseDTO {
    private Integer id;
    private Integer movieId;
    private String movieTitle;
    private String posterUrl;
    private Integer movieDuration;
    private Integer roomId;
    private String roomName;
    private Integer cinemaId;
    private String cinemaName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private BigDecimal price;
}
