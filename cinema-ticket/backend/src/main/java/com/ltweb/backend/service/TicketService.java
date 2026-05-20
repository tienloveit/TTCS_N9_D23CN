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
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.AuditAction;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.SeatType;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.TicketMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.SeatRepository;
import com.ltweb.backend.repository.SeatTypePriceRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class TicketService {

  private final TicketRepository ticketRepository;
  private final BookingRepository bookingRepository;
  private final ShowtimeRepository showtimeRepository;
  private final SeatRepository seatRepository;
  private final SeatTypePriceRepository seatTypePriceRepository;
  private final UserRepository userRepository;
  private final StringRedisTemplate redisTemplate;
  private final TicketMapper ticketMapper;
  private final QRCodeReaderService qrCodeReaderService;
  private final AuditLogService auditLogService;

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
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
  @Transactional(readOnly = true)
  public List<TicketResponse> getTicketsByShowtimeId(Long showtimeId) {
    requireShowtimeAccessForCurrentBranchOperator(showtimeId);

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

      if (Boolean.FALSE.equals(dbTickets.get(i).getSeat().getIsActive())) {
        ticket.setDisplayStatus(TicketStatus.BOOKED);
        continue;
      }

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

  @Transactional(readOnly = true)
  public TicketResponse getTicketById(Long ticketId) {
    Ticket ticket = getTicket(ticketId);
    requireTicketViewAccess(ticket);
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
      requireBookingCheckInAccess(ticket.getBooking());
      Map<Long, Boolean> alreadyCheckedIn = Map.of(ticket.getId(), ticket.getCheckedInAt() != null);
      checkInTicket(ticket);
      auditLogService.record(
          AuditAction.TICKET_CHECKED_IN,
          "Ticket",
          ticket.getId(),
          "Checked in ticket " + ticket.getId() + " for booking " + ticket.getBooking().getBookingCode());
      return buildCheckInResponse(ticket.getBooking(), List.of(ticket), alreadyCheckedIn);
    }

    Booking booking =
        bookingRepository
            .findByBookingCode(code)
            .orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_FOUND));
    if (booking.getTickets() == null || booking.getTickets().isEmpty()) {
      throw new AppException(ErrorCode.TICKET_NOT_FOUND);
    }
    requireBookingCheckInAccess(booking);

    Map<Long, Boolean> alreadyCheckedIn = new HashMap<>();
    booking
        .getTickets()
        .forEach(ticket -> alreadyCheckedIn.put(ticket.getId(), ticket.getCheckedInAt() != null));
    booking.getTickets().forEach(this::checkInTicket);
    auditLogService.record(
        AuditAction.TICKET_CHECKED_IN,
        "Booking",
        booking.getId(),
        "Checked in booking " + booking.getBookingCode() + " with " + booking.getTickets().size() + " tickets");
    return buildCheckInResponse(booking, booking.getTickets(), alreadyCheckedIn);
  }

  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  @Transactional
  public TicketCheckInResponse checkInByQRImage(MultipartFile qrImage) {
    // Decode QR code from image
    String code = qrCodeReaderService.decodeQRCode(qrImage);

    // Reuse existing checkIn logic
    CheckInTicketRequest request = new CheckInTicketRequest();
    request.setCode(code);
    return checkIn(request);
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

  private void requireShowtimeAccessForCurrentBranchOperator(Long showtimeId) {
    User currentUser = getCurrentUserOrNull();
    if (currentUser == null
        || currentUser.getRole() == UserRole.ADMIN
        || currentUser.getRole() == UserRole.USER) {
      return;
    }
    if (!isBranchOperator(currentUser) || currentUser.getBranchId() == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }
    Showtime showtime =
        showtimeRepository
            .findById(showtimeId)
            .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
    if (!isShowtimeInBranch(showtime, currentUser.getBranchId())) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }
  }

  private void requireTicketViewAccess(Ticket ticket) {
    User currentUser = getCurrentUserOrNull();
    if (currentUser == null) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }
    if (currentUser.getRole() == UserRole.ADMIN) {
      return;
    }
    Booking booking = ticket.getBooking();
    if (booking != null
        && booking.getUser() != null
        && Objects.equals(booking.getUser().getId(), currentUser.getId())) {
      return;
    }
    if (isBranchOperator(currentUser)
        && currentUser.getBranchId() != null
        && isTicketInBranch(ticket, currentUser.getBranchId())) {
      return;
    }
    throw new AppException(ErrorCode.UNAUTHORIZED);
  }

  private void requireBookingCheckInAccess(Booking booking) {
    if (booking == null) {
      throw new AppException(ErrorCode.INVALID_TICKET_CHECKIN);
    }
    User currentUser = getUserCurrent();
    if (currentUser.getRole() == UserRole.ADMIN) {
      return;
    }
    if (currentUser.getRole() == UserRole.STAFF
        && currentUser.getBranchId() != null
        && isBookingInBranch(booking, currentUser.getBranchId())) {
      return;
    }
    throw new AppException(ErrorCode.UNAUTHORIZED);
  }

  private boolean isBookingInBranch(Booking booking, Long branchId) {
    return booking.getShowtime() != null && isShowtimeInBranch(booking.getShowtime(), branchId);
  }

  private boolean isTicketInBranch(Ticket ticket, Long branchId) {
    return ticket.getShowtime() != null && isShowtimeInBranch(ticket.getShowtime(), branchId);
  }

  private boolean isShowtimeInBranch(Showtime showtime, Long branchId) {
    return showtime.getRoom() != null
        && showtime.getRoom().getBranch() != null
        && Objects.equals(showtime.getRoom().getBranch().getBranchId(), branchId);
  }

  private boolean isBranchOperator(User user) {
    return user.getRole() == UserRole.STAFF || user.getRole() == UserRole.MANAGER;
  }

  private User getUserCurrent() {
    String username =
        Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
    return userRepository
        .findByUsername(username)
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }

  private User getCurrentUserOrNull() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated()) {
      return null;
    }
    String username = authentication.getName();
    if (username == null || "anonymousUser".equals(username)) {
      return null;
    }
    return userRepository.findByUsername(username).orElse(null);
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
