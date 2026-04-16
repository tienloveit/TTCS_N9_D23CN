package com.cgvptit.movie.mapper;

import com.cgvptit.movie.dto.response.RoomResponseDTO;
import com.cgvptit.movie.entity.Room;
import org.springframework.stereotype.Component;

@Component
public class RoomBeanMapper {

    public RoomResponseDTO toResponse(Room room) {
        return RoomResponseDTO.builder()
                .id(room.getId())
                .name(room.getName())
                .capacity(room.getCapacity())
                .cinemaId(room.getCinema() != null ? room.getCinema().getId() : null)
                .cinemaName(room.getCinema() != null ? room.getCinema().getName() : null)
                .build();
    }
}
