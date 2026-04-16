package com.cgvptit.movie.service.impl;

import com.cgvptit.movie.dto.request.ShowtimeRequestDTO;
import com.cgvptit.movie.entity.Movie;
import com.cgvptit.movie.entity.Room;
import com.cgvptit.movie.entity.Showtime;
import com.cgvptit.movie.repository.MovieRepository;
import com.cgvptit.movie.repository.RoomRepository;
import com.cgvptit.movie.repository.ShowtimeRepository;
import com.cgvptit.movie.repository.TicketRepository;
import com.cgvptit.movie.service.AdminShowtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminShowtimeServiceImpl implements AdminShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final RoomRepository roomRepository;
    private final TicketRepository ticketRepository;

    @Override
    public Page<Showtime> getAllShowtimes(int page, int size) {
        return showtimeRepository.findAll(PageRequest.of(page, size));
    }

    @Override
    public List<Showtime> getShowtimesByRoom(Integer roomId) {
        return showtimeRepository.findByRoomId(roomId);
    }

    @Override
    public List<Showtime> getShowtimesByMovie(Integer movieId) {
        return showtimeRepository.findByMovieId(movieId);
    }

    @Override
    public Showtime getShowtimeById(Integer id) {
        return showtimeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy suất chiếu"));
    }

    @Override
    @Transactional
    public Showtime createShowtime(ShowtimeRequestDTO request) {
        validateRequest(request);

        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phim"));

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng chiếu"));

        boolean conflict = showtimeRepository.existsConflict(
                request.getRoomId(), request.getStartTime(), request.getEndTime(), null);

        if (conflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Phòng " + room.getName() + " đã có suất chiếu khác trong khung giờ này!");
        }

        Showtime showtime = Showtime.builder()
                .movie(movie)
                .room(room)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .price(request.getPrice())
                .build();

        return showtimeRepository.save(showtime);
    }

    @Override
    @Transactional
    public Showtime updateShowtime(Integer id, ShowtimeRequestDTO request) {
        validateRequest(request);

        Showtime existing = getShowtimeById(id);

        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phim"));

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng chiếu"));

        boolean conflict = showtimeRepository.existsConflict(
                request.getRoomId(), request.getStartTime(), request.getEndTime(), id);

        if (conflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Phòng " + room.getName() + " đã có suất chiếu khác trong khung giờ này!");
        }

        existing.setMovie(movie);
        existing.setRoom(room);
        existing.setStartTime(request.getStartTime());
        existing.setEndTime(request.getEndTime());
        existing.setPrice(request.getPrice());

        return showtimeRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteShowtime(Integer id) {
        if (!showtimeRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy suất chiếu");
        }
        // Không cho xóa nếu đã có vé được đặt
        if (ticketRepository.existsByShowtimeId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Không thể xóa suất chiếu đã có vé đặt. Hãy hủy các vé trước!");
        }
        showtimeRepository.deleteById(id);
    }

    private void validateRequest(ShowtimeRequestDTO request) {
        if (request.getEndTime() != null && request.getStartTime() != null
                && !request.getEndTime().isAfter(request.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giờ kết thúc phải sau giờ bắt đầu");
        }
    }
}

