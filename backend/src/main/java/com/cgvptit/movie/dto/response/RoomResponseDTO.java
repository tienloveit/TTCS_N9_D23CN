package com.cgvptit.movie.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomResponseDTO {
    private Integer id;
    private String name;
    private Integer capacity;
    private Integer cinemaId;
    private String cinemaName;
}
