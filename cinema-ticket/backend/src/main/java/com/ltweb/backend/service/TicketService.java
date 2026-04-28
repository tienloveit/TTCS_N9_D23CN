package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CheckInTicketRequest;
import com.ltweb.backend.dto.request.UpdateTicketRequest;
import com.ltweb.backend.dto.response.TicketCheckInItemResponse;
import com.ltweb.backend.dto.response.TicketCheckInResponse;
import com.ltweb.backend.dto.response.TicketResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.SeatTypePrice;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.SeatType;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.TicketMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.SeatRepository;
import com.ltweb.backend.repository.SeatTypePriceRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TicketService {

  private final TicketRepository ticketRepository;
  private final BookingRepository bookingRepository;
  private final ShowtimeRepository showtimeRepository;
  private final SeatRepository seatRepository;
  private final SeatTypePriceRepository seatTypePriceRepository;
  private final StringRedisTemplate redisTemplate;
  private final TicketMapper ticketMapper;

  @PreAuthorize("hasRole('ADMIN')")
  @Transactional
  public void createTicket(Showtime showtime) {
    List<Seat> seats = seatRepository.findByRoomId(showtime.getRoom().getId());

    // lấy sẵn seatTypePrice ra thay vì mỗi lần lại phải chọc vào db để lấy, tránh N + 1
    Map<SeatType, BigDecimal> pricesMap =
        seatTypePriceRepository.findAll().stream()
            .collect(Collectors.toMap(SeatTypePrice::getSeatType, SeatTypePrice::getPrice));

    List<Ticket> tickets =
        seats.stream()
            .map(
                seat ->
                    Ticket.builder()
                        .price(pricesMap.get(seat.getSeatType()))
                        .ticketStatus(TicketStatus.AVAILABLE)
                        .showtime(showtime)
                        .seat(seat)
                        .build())
            .toList();

    ticketRepository.saveAll(tickets);
  }

  @Transactional(readOnly = true)
  public List<TicketResponse> getAllTickets() {
    return ticketRepository.findAll().stream().map(ticketMapper::toTicketResponse).toList();
  }

  // Không dùng @Cacheable vì cần đọc Redis seat lock real-time mỗi request
  public List<TicketResponse> getTicketsByShowtimeId(Long showtimeId) {

    // Bước 1: Lấy toàn bộ ticket của suất chiếu từ DB
    List<Ticket> dbTickets = ticketRepository.findByShowtimeId(showtimeId);

    List<TicketResponse> tickets = dbTickets.stream().map(ticketMapper::toTicketResponse).toList();

    // Bước 2: Tạo danh sách key Redis tương ứng với từng ghế
    List<String> seatKeys =
        tickets.stream()
            .map(ticket -> "seat_hold:" + showtimeId + ":" + ticket.getSeatId())
            .toList();

    // Bước 3: Batch query Redis — 1 lần lấy tất cả
    List<String> redisHoldStatus = redisTemplate.opsForValue().multiGet(seatKeys);

    // Bước 4: Merge trạng thái DB với Redis để tạo displayStatus
    for (int i = 0; i < tickets.size(); i++) {
      TicketResponse ticket = tickets.get(i);

      // Ghế đã thanh toán thành công -> luôn BOOKED, không override
      if (ticket.getTicketStatus() == TicketStatus.BOOKED) {
        ticket.setDisplayStatus(TicketStatus.BOOKED);
        continue;
      }

      // Kiểm tra Redis: có key seat_hold -> ghế đang bị giữ bởi user khác
      // check lại cả redis để xác định xem có đúng vé đang bị HOLDING ko
      boolean isHeldInRedis = redisHoldStatus != null && redisHoldStatus.get(i) != null;

      if (isHeldInRedis) {
        // Ghế đang bị lock tạm thời trong Redis (user đang ở bước thanh toán)
        ticket.setDisplayStatus(TicketStatus.HOLDING);
      } else {
        // Không có trong Redis -> lấy trực tiếp từ DB
        ticket.setDisplayStatus(ticket.getTicketStatus());
      }
    }

    return tickets;
  }

  public TicketResponse getTicketById(Long ticketId) {
    Ticket ticket = getTicket(ticketId);
    return ticketMapper.toTicketResponse(ticket);
  }

  public TicketResponse updateTicket(Long ticketId, UpdateTicketRequest request) {
    Ticket ticket = getTicket(ticketId);

    ticketMapper.updateTicket(ticket, request);

    if (request.getBookingId() != null) {
      Booking booking =
          bookingRepository
              .findById(request.getBookingId())
              .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
      ticket.setBooking(booking);
    }

    if (request.getShowtimeId() != null) {
      Showtime showtime =
          showtimeRepository
              .findById(request.getShowtimeId())
              .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
      ticket.setShowtime(showtime);
    }

    if (request.getSeatId() != null) {
      Seat seat =
          seatRepository
              .findById(request.getSeatId())
              .orElseThrow(() -> new AppException(ErrorCode.SEAT_NOT_FOUND));
      ticket.setSeat(seat);
    }

    return ticketMapper.toTicketResponse(ticketRepository.save(ticket));
  }

  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  @Transactional
  public TicketCheckInResponse checkIn(CheckInTicketRequest request) {
    String code = request.getCode().trim();
    Optional<Ticket> ticketOpt = findTicketByCheckInCode(code);

    if (ticketOpt.isPresent()) {
      Ticket ticket = ticketOpt.get();
      Map<Long, Boolean> alreadyCheckedIn = Map.of(ticket.getId(), ticket.getCheckedInAt() != null);
      checkInTicket(ticket);
      return buildCheckInResponse(ticket.getBooking(), List.of(ticket), alreadyCheckedIn);
    }

    Booking booking =
        bookingRepository
            .findByBookingCode(code)
            .orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_FOUND));
    if (booking.getTickets() == null || booking.getTickets().isEmpty()) {
      throw new AppException(ErrorCode.TICKET_NOT_FOUND);
    }

    Map<Long, Boolean> alreadyCheckedIn = new HashMap<>();
    booking
        .getTickets()
        .forEach(ticket -> alreadyCheckedIn.put(ticket.getId(), ticket.getCheckedInAt() != null));
    booking.getTickets().forEach(this::checkInTicket);
    return buildCheckInResponse(booking, booking.getTickets(), alreadyCheckedIn);
  }

  public void deleteTicket(Long ticketId) {
    Ticket ticket = getTicket(ticketId);
    ticketRepository.delete(ticket);
  }

  @Transactional
  public void deleteByShowtimeId(Long showtimeId) {
    ticketRepository.deleteByShowtimeId(showtimeId);
  }

  // ===== PRIVATE HELPER =====
  private Ticket getTicket(Long ticketId) {
    return ticketRepository
        .findById(ticketId)
        .orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_FOUND));
  }

  private Optional<Ticket> findTicketByCheckInCode(String code) {
    Long ticketId = extractTicketId(code);
    if (ticketId != null) {
      return ticketRepository.findById(ticketId);
    }
    return ticketRepository.findByQrCode(code);
  }

  private Long extractTicketId(String code) {
    if (code.matches("\\d+")) {
      return Long.valueOf(code);
    }

    String[] parts = code.split("\\|");
    for (String part : parts) {
      if (part.startsWith("TICKET=")) {
        String value = part.substring("TICKET=".length());
        if (value.matches("\\d+")) {
          return Long.valueOf(value);
        }
      }
    }
    return null;
  }

  private void checkInTicket(Ticket ticket) {
    Booking booking = ticket.getBooking();
    if (booking == null
        || booking.getStatus() != BookingStatus.COMPLETED
        || booking.getPaymentStatus() != PaymentStatus.PAID
        || ticket.getTicketStatus() != TicketStatus.BOOKED) {
      throw new AppException(ErrorCode.INVALID_TICKET_CHECKIN);
    }

    if (ticket.getCheckedInAt() == null) {
      ticket.setCheckedInAt(LocalDateTime.now());
      ticketRepository.save(ticket);
    }
  }

  private TicketCheckInResponse buildCheckInResponse(
      Booking booking, List<Ticket> tickets, Map<Long, Boolean> alreadyCheckedIn) {
    return TicketCheckInResponse.builder()
        .bookingId(booking.getId())
        .bookingCode(booking.getBookingCode())
        .customerName(booking.getUser() == null ? null : booking.getUser().getFullName())
        .movieName(
            booking.getShowtime() == null || booking.getShowtime().getMovie() == null
                ? null
                : booking.getShowtime().getMovie().getMovieName())
        .branchName(
            booking.getShowtime() == null
                    || booking.getShowtime().getRoom() == null
                    || booking.getShowtime().getRoom().getBranch() == null
                ? null
                : booking.getShowtime().getRoom().getBranch().getName())
        .roomName(
            booking.getShowtime() == null || booking.getShowtime().getRoom() == null
                ? null
                : booking.getShowtime().getRoom().getName())
        .showtimeStart(booking.getShowtime() == null ? null : booking.getShowtime().getStartTime())
        .tickets(
            tickets.stream()
                .map(ticket -> toCheckInItem(ticket, alreadyCheckedIn.getOrDefault(ticket.getId(), false)))
                .toList())
        .message("Check-in successful")
        .build();
  }

  private TicketCheckInItemResponse toCheckInItem(Ticket ticket, boolean alreadyCheckedIn) {
    return TicketCheckInItemResponse.builder()
        .ticketId(ticket.getId())
        .seatCode(ticket.getSeat() == null ? null : ticket.getSeat().getSeatCode())
        .qrCode(ticket.getQrCode())
        .checkedIn(ticket.getCheckedInAt() != null)
        .alreadyCheckedIn(alreadyCheckedIn)
        .checkedInAt(ticket.getCheckedInAt())
        .build();
  }
}
