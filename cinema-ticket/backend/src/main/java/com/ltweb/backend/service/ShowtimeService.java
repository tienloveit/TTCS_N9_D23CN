package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateShowtimeRequest;
import com.ltweb.backend.dto.request.UpdateShowtimeRequest;
import com.ltweb.backend.dto.response.ShowtimeResponse;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.ShowtimeMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.MovieRepository;
import com.ltweb.backend.repository.RoomRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShowtimeService {

  private final ShowtimeRepository showtimeRepository;
  private final RoomRepository roomRepository;
  private final MovieRepository movieRepository;
  private final BookingRepository bookingRepository;
  private final TicketRepository ticketRepository;
  private final ShowtimeMapper showtimeMapper;
  private final TicketService ticketService;

  @Transactional
  public ShowtimeResponse createShowtime(CreateShowtimeRequest request) {

    Room room =
        roomRepository
            .findById(request.getRoomId())
            .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

    Movie movie =
        movieRepository
            .findById(request.getMovieId())
            .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));

    if (showtimeRepository.existsOverlappingShowtime(
        request.getRoomId(), request.getStartTime(), request.getEndTime())) {
      throw new AppException(ErrorCode.SHOWTIME_TIME_OVERLAP);
    }

    Showtime showtime = showtimeMapper.toShowtime(request);
    showtime.setRoom(room);
    showtime.setMovie(movie);

    Showtime savedShowtime = showtimeRepository.save(showtime);
    ticketService.createTicket(savedShowtime);

    return showtimeMapper.toResponse(savedShowtime);
  }

  @Transactional
  public ShowtimeResponse update(Long showtimeId, UpdateShowtimeRequest request) {

    Showtime showtime = getShowtime(showtimeId);

    showtimeMapper.updateShowtime(showtime, request);

    // Check overlap nếu thời gian thay đổi
    if (request.getStartTime() != null || request.getEndTime() != null) {
      if (showtimeRepository.existsOverlappingShowtimeExcluding(
          showtime.getRoom().getId(), showtime.getStartTime(), showtime.getEndTime(), showtimeId)) {
        throw new AppException(ErrorCode.SHOWTIME_TIME_OVERLAP);
      }
    }

    return showtimeMapper.toResponse(showtimeRepository.save(showtime));
  }

  @PreAuthorize("hasRole('ADMIN')")
  @Transactional
  public void delete(Long showtimeId) {
    Showtime showtime = getShowtime(showtimeId);

    // Chặn xóa nếu đã có booking đã thanh toán thành công
    boolean hasPaidBooking =
        !bookingRepository.findByShowtimeIdAndStatus(showtimeId, BookingStatus.COMPLETED).isEmpty();
    if (hasPaidBooking) {
      throw new AppException(ErrorCode.SHOWTIME_HAS_BOOKINGS);
    }

    // Hủy các booking PENDING còn lại
    bookingRepository
        .findByShowtimeIdAndStatus(showtimeId, BookingStatus.PENDING)
        .forEach(
            b -> {
              b.setStatus(BookingStatus.CANCELLED);
              b.setPaymentStatus(PaymentStatus.CANCELLED);
              b.getTickets()
                  .forEach(
                      t -> {
                        t.setBooking(null);
                        t.setTicketStatus(TicketStatus.AVAILABLE);
                      });
              bookingRepository.save(b);
            });

    // Xóa toàn bộ vé thuộc suất chiếu này trước khi xóa suất chiếu
    ticketRepository.deleteByShowtimeId(showtimeId);

    showtimeRepository.delete(showtime);
  }

  @Transactional(readOnly = true)
  public ShowtimeResponse getById(Long showtimeId) {
    Showtime showtime = getShowtime(showtimeId);
    return showtimeMapper.toResponse(showtime);
  }

  @Transactional(readOnly = true)
  public List<ShowtimeResponse> getAll() {
    return showtimeRepository.findAll().stream()
        .sorted(Comparator.comparing(Showtime::getStartTime).reversed())
        .map(showtimeMapper::toResponse)
        .toList();
  }

  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  @Transactional(readOnly = true)
  public List<ShowtimeResponse> getToday() {
    LocalDate today = LocalDate.now();
    LocalDateTime startOfDay = today.atStartOfDay();
    LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

    return showtimeRepository
        .findByStartTimeGreaterThanEqualAndStartTimeLessThanOrderByStartTimeAsc(
            startOfDay, endOfDay)
        .stream()
        .map(showtimeMapper::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<ShowtimeResponse> getByRoom(Long roomId) {
    return showtimeRepository.findByRoomId(roomId).stream()
        .map(showtimeMapper::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<ShowtimeResponse> getByMovie(Long movieId) {
    return showtimeRepository.findByMovieId(movieId).stream()
        .map(showtimeMapper::toResponse)
        .toList();
  }

  /**
   * Lấy suất chiếu theo chi nhánh + ngày, nhóm theo phim. Trả về danh sách Map, mỗi entry chứa
   * thông tin phim + danh sách suất chiếu.
   */
  @Transactional(readOnly = true)
  public List<Map<String, Object>> getByBranch(Long branchId, LocalDate date) {
    LocalDateTime startOfDay = date.atStartOfDay();
    LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

    List<Showtime> showtimes =
        showtimeRepository.findByBranchAndDate(branchId, startOfDay, endOfDay);

    // Nhóm theo movie
    Map<Long, List<Showtime>> grouped =
        showtimes.stream()
            .collect(
                Collectors.groupingBy(
                    s -> s.getMovie().getId(), LinkedHashMap::new, Collectors.toList()));

    List<Map<String, Object>> result = new ArrayList<>();
    for (var entry : grouped.entrySet()) {
      Movie movie = entry.getValue().getFirst().getMovie();
      Map<String, Object> movieGroup = new LinkedHashMap<>();
      movieGroup.put("movieId", movie.getId());
      movieGroup.put("movieName", movie.getMovieName());
      movieGroup.put("thumbnailUrl", movie.getThumbnailUrl());
      movieGroup.put("durationMinutes", movie.getDurationMinutes());
      movieGroup.put("ageRating", movie.getAgeRating());
      movieGroup.put("language", movie.getLanguage());

      List<Map<String, Object>> showtimeList =
          entry.getValue().stream()
              .map(
                  s -> {
                    Map<String, Object> st = new LinkedHashMap<>();
                    st.put("showtimeId", s.getId());
                    st.put("roomId", s.getRoom().getId());
                    st.put("roomName", s.getRoom().getName());
                    st.put("roomType", s.getRoom().getRoomType());
                    st.put("startTime", s.getStartTime());
                    st.put("endTime", s.getEndTime());
                    st.put("status", s.getStatus());
                    return st;
                  })
              .toList();

      movieGroup.put("showtimes", showtimeList);
      result.add(movieGroup);
    }

    return result;
  }

  // ===== PRIVATE HELPER =====
  private Showtime getShowtime(Long showtimeId) {
    return showtimeRepository
        .findById(showtimeId)
        .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
  }
}
