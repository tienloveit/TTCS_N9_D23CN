package com.cgvptit.movie.mapper;

import com.cgvptit.movie.dto.response.ShowtimeResponseDTO;
import com.cgvptit.movie.entity.Showtime;
import org.springframework.stereotype.Component;

@Component
public class ShowtimeBeanMapper {

    public ShowtimeResponseDTO toResponse(Showtime s) {
        return ShowtimeResponseDTO.builder()
                .id(s.getId())
                .movieId(s.getMovie() != null ? s.getMovie().getId() : null)
                .movieTitle(s.getMovie() != null ? s.getMovie().getTitle() : null)
                .posterUrl(s.getMovie() != null ? s.getMovie().getPosterUrl() : null)
                .movieDuration(s.getMovie() != null ? s.getMovie().getDuration() : null)
                .roomId(s.getRoom() != null ? s.getRoom().getId() : null)
                .roomName(s.getRoom() != null ? s.getRoom().getName() : null)
                .cinemaId(s.getRoom() != null && s.getRoom().getCinema() != null ? s.getRoom().getCinema().getId() : null)
                .cinemaName(s.getRoom() != null && s.getRoom().getCinema() != null ? s.getRoom().getCinema().getName() : null)
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .price(s.getPrice())
                .build();
    }
}
