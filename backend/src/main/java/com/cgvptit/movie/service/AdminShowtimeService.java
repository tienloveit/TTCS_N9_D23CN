package com.cgvptit.movie.service;

import com.cgvptit.movie.dto.request.ShowtimeRequestDTO;
import com.cgvptit.movie.entity.Showtime;
import org.springframework.data.domain.Page;

import java.util.List;

public interface AdminShowtimeService {
    Page<Showtime> getAllShowtimes(int page, int size);
    List<Showtime> getShowtimesByRoom(Integer roomId);
    List<Showtime> getShowtimesByMovie(Integer movieId);
    Showtime getShowtimeById(Integer id);
    Showtime createShowtime(ShowtimeRequestDTO request);
    Showtime updateShowtime(Integer id, ShowtimeRequestDTO request);
    void deleteShowtime(Integer id);
}
