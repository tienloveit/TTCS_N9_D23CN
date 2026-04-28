package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateBookingFoodRequest;
import com.ltweb.backend.dto.request.CreateBookingRequest;
import com.ltweb.backend.dto.request.StaffBookingRequest;
import com.ltweb.backend.dto.request.UpdateBookingRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.dto.response.SeatStatusEvent;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.event.BookingPaidEvent;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

  private final BookingRepository bookingRepository;
  private final ShowtimeRepository showtimeRepository;
  private final TicketRepository ticketRepository;
  private final FoodRepository foodRepository;
  private final UserRepository userRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final SimpMessagingTemplate simpMessagingTemplate;
  private final BookingMapper bookingMapper;
  private final PasswordEncoder passwordEncoder;
  private final ApplicationEventPublisher eventPublisher;

  @Transactional
  public BookingResponse createBooking(CreateBookingRequest request) {
    // người dùng hiện tại
    User user = getUserCurrent();

    Showtime showtime =
        showtimeRepository
            .findById(request.getShowtimeId())
            .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));

    Set<Long> uniqueSeatIds = new HashSet<>(request.getSeatIds());
    if (uniqueSeatIds.size() != request.getSeatIds().size()) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }

    List<Ticket> selectedTickets =
        request.getSeatIds().stream()
            .map(
                seatId ->
                    ticketRepository
                        .findByShowtimeIdAndSeatId(showtime.getId(), seatId)
                        .orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_FOUND)))
            .toList();

    boolean hasUnavailableTicket =
        selectedTickets.stream()
            .anyMatch(ticket -> ticket.getTicketStatus() != TicketStatus.AVAILABLE);

    if (hasUnavailableTicket) {
      throw new AppException(ErrorCode.TICKET_NOT_AVAILABLE);
    }

    Map<Long, Integer> foodQuantities = getFoodQuantities(request.getFoods());
    List<Food> selectedFoods = getSelectedFoods(foodQuantities);
    BigDecimal foodTotal = calculateFoodTotal(selectedFoods, foodQuantities);

    // khoá ghế bằng Redis
    String bookingUserId = String.valueOf(user.getId());
    for (Ticket ticket : selectedTickets) {
      String seatKey = getSeatKey(showtime.getId(), ticket.getSeat().getId());
      Boolean locked =
          redisTemplate.opsForValue().setIfAbsent(seatKey, bookingUserId, 6, TimeUnit.MINUTES);

      if (Boolean.FALSE.equals(locked)) {
        unlockSeats(showtime.getId(), selectedTickets);
        throw new AppException(ErrorCode.TICKET_NOT_AVAILABLE);
      }

      // lock ghế xong broadcast qua WebSocket để cập nhật real time trạng thái hàng ghế
      simpMessagingTemplate.convertAndSend(
          "/topic/showtime/" + showtime.getId() + "/seats",
          SeatStatusEvent.builder().seatId(ticket.getSeat().getId()).status("HOLDING").build());
    }

    BigDecimal totalAmount =
        selectedTickets.stream().map(Ticket::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
    totalAmount = totalAmount.add(foodTotal);

    String bookingCode = generateBookingCode();
    Booking booking =
        Booking.builder()
            .bookingCode(bookingCode)
            .user(user)
            .showtime(showtime)
            .totalAmount(totalAmount)
            .status(BookingStatus.PENDING)
            .paymentCreatedAt(LocalDateTime.now())
            .paymentStatus(PaymentStatus.PENDING)
            .expiresAt(LocalDateTime.now().plusMinutes(6))
            .build();
    booking.setBookingFoods(buildBookingFoods(booking, selectedFoods, foodQuantities));

    bookingRepository.save(booking);

    selectedTickets.forEach(
        ticket -> {
          ticket.setBooking(booking);
          ticket.setTicketStatus(TicketStatus.HOLDING);
        });
    ticketRepository.saveAll(selectedTickets);
    booking.setTickets(selectedTickets);

    log.info("Booking created with code: {} for user: {}", bookingCode, user.getUsername());

    return bookingMapper.toBookingResponse(booking);
  }

  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  @Transactional
  public BookingResponse createStaffBooking(StaffBookingRequest request) {
    Showtime showtime =
        showtimeRepository
            .findById(request.getShowtimeId())
            .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));

    Set<Long> uniqueSeatIds = new HashSet<>(request.getSeatIds());
    if (uniqueSeatIds.size() != request.getSeatIds().size()) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }

    List<Ticket> selectedTickets =
        request.getSeatIds().stream()
            .map(
                seatId ->
                    ticketRepository
                        .findByShowtimeIdAndSeatId(showtime.getId(), seatId)
                        .orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_FOUND)))
            .toList();

    boolean hasUnavailableTicket =
        selectedTickets.stream()
            .anyMatch(
                ticket ->
                    ticket.getTicketStatus() != TicketStatus.AVAILABLE
                        || hasActiveSeatHold(showtime.getId(), ticket));
    if (hasUnavailableTicket) {
      throw new AppException(ErrorCode.TICKET_NOT_AVAILABLE);
    }

    Map<Long, Integer> foodQuantities = getFoodQuantities(request.getFoods());
    List<Food> selectedFoods = getSelectedFoods(foodQuantities);
    BigDecimal foodTotal = calculateFoodTotal(selectedFoods, foodQuantities);
    BigDecimal ticketTotal =
        selectedTickets.stream().map(Ticket::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);

    User customer = getOrCreateStaffCustomer(request);
    LocalDateTime now = LocalDateTime.now();
    Booking booking =
        Booking.builder()
            .bookingCode(generateBookingCode())
            .user(customer)
            .showtime(showtime)
            .totalAmount(ticketTotal.add(foodTotal))
            .status(BookingStatus.COMPLETED)
            .paymentCreatedAt(now)
            .paymentStatus(PaymentStatus.PAID)
            .paymentMethod(request.getPaymentMethod() == null ? PaymentMethod.CASH : request.getPaymentMethod())
            .paidAt(now)
            .build();
    booking.setBookingFoods(buildBookingFoods(booking, selectedFoods, foodQuantities));

    bookingRepository.save(booking);

    selectedTickets.forEach(
        ticket -> {
          ticket.setBooking(booking);
          ticket.setTicketStatus(TicketStatus.BOOKED);
          ticket.setQrCode(getOrCreateTicketQrCode(booking, ticket));
          ticketRepository.save(ticket);
          simpMessagingTemplate.convertAndSend(
              "/topic/showtime/" + showtime.getId() + "/seats",
              SeatStatusEvent.builder().seatId(ticket.getSeat().getId()).status("BOOKED").build());
        });
    booking.setTickets(selectedTickets);
    unlockSeats(showtime.getId(), selectedTickets);
    eventPublisher.publishEvent(new BookingPaidEvent(booking.getId()));

    log.info("Staff booking created with code: {}", booking.getBookingCode());
    return bookingMapper.toBookingResponse(booking);
  }

  @Transactional(readOnly = true)
  public List<BookingResponse> getAllBookings() {
    return bookingRepository.findAll().stream().map(bookingMapper::toBookingResponse).toList();
  }

  @Transactional(readOnly = true)
  public BookingResponse getBookingById(Long bookingId) {
    Booking booking = getBooking(bookingId);
    return bookingMapper.toBookingResponse(booking);
  }

  @Transactional(readOnly = true)
  public BookingResponse getMyBookings(Long bookingId) {
    User user = getUserCurrent();

    Booking booking = getBooking(bookingId);

    if (!booking.getUser().getId().equals(user.getId())) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    return bookingMapper.toBookingResponse(booking);
  }

  @Transactional(readOnly = true)
  public List<BookingResponse> getMyBookingsList() {
    User user = getUserCurrent();

    return bookingRepository.findByUserId(user.getId()).stream()
        .map(bookingMapper::toBookingResponse)
        .toList();
  }

  @Transactional
  public BookingResponse updateBooking(Long bookingId, UpdateBookingRequest request) {
    Booking booking = getBooking(bookingId);

    if (request.getStatus() != null) {
      booking.setStatus(request.getStatus());
    }

    return bookingMapper.toBookingResponse(bookingRepository.save(booking));
  }

  @Transactional
  public void cancelBooking(Long bookingId) {
    Booking booking = getBooking(bookingId);

    // Chỉ cho phép huỷ khi trạng thái PENDING (đang chờ thanh toán)
    if (booking.getStatus() != BookingStatus.PENDING) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_CANCEL);
    }

    booking.setStatus(BookingStatus.CANCELLED);
    bookingRepository.save(booking);

    // Trả trạng thái của vé về AVAILABLE
    booking
        .getTickets()
        .forEach(
            ticket -> {
              ticket.setBooking(null); // huỷ connect với booking
              ticket.setTicketStatus(TicketStatus.AVAILABLE);
              ticketRepository.save(ticket);

              simpMessagingTemplate.convertAndSend(
                  "/topic/showtime/" + booking.getShowtime().getId() + "/seats",
                  SeatStatusEvent.builder()
                      .seatId(ticket.getSeat().getId())
                      .status("AVAILABLE")
                      .build());
            });

    unlockSeats(booking.getShowtime().getId(), booking.getTickets()); // chủ động huỷ

    if (booking.getPaymentStatus() == PaymentStatus.PENDING) {
      booking.setPaymentStatus(PaymentStatus.CANCELLED);
      bookingRepository.save(booking);
    }

    log.info("Booking cancelled: {}", bookingId);
  }

  private String getSeatKey(Long showTimeId, Long seatId) {
    return "seat_hold:" + showTimeId + ":" + seatId;
  }

  private boolean hasActiveSeatHold(Long showtimeId, Ticket ticket) {
    return Boolean.TRUE.equals(redisTemplate.hasKey(getSeatKey(showtimeId, ticket.getSeat().getId())));
  }

  private void unlockSeats(Long showTimeId, List<Ticket> tickets) {
    try {
      List<String> keys =
          tickets.stream().map(ticket -> getSeatKey(showTimeId, ticket.getSeat().getId())).toList();
      redisTemplate.delete(keys);
    } catch (Exception e) {
      log.error("Thất bại trong việc xoá vé: {}", e.getMessage());
    }
  }

  // ===== PRIVATE HELPER =====
  private User getOrCreateStaffCustomer(StaffBookingRequest request) {
    String email = trimToNull(request.getCustomerEmail());
    String phone = trimToNull(request.getCustomerPhone());
    String fullName = trimToNull(request.getCustomerName());

    if (email != null) {
      var userByEmail = userRepository.findByEmail(email);
      if (userByEmail.isPresent()) {
        return userByEmail.get();
      }
    }

    if (phone != null) {
      var userByPhone = userRepository.findByPhoneNumber(phone);
      if (userByPhone.isPresent()) {
        return userByPhone.get();
      }
    }

    User customer =
        User.builder()
            .username(generateGuestUsername(email, phone))
            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
            .fullName(fullName == null ? "Walk-in Customer" : fullName)
            .email(email)
            .phoneNumber(phone)
            .role(UserRole.USER)
            .status(UserStatus.ACTIVE)
            .build();
    return userRepository.save(customer);
  }

  private String generateGuestUsername(String email, String phone) {
    String source = phone != null ? phone : email;
    String base =
        source == null
            ? "guest"
            : source.toLowerCase().replaceAll("[^a-z0-9]", "");
    if (!StringUtils.hasText(base)) {
      base = "guest";
    }

    String username = "guest_" + base;
    int suffix = 1;
    while (userRepository.existsByUsername(username)) {
      username = "guest_" + base + "_" + suffix++;
    }
    return username;
  }

  private String getOrCreateTicketQrCode(Booking booking, Ticket ticket) {
    if (StringUtils.hasText(ticket.getQrCode())) {
      return ticket.getQrCode();
    }
    String seatCode =
        ticket.getSeat() == null || ticket.getSeat().getSeatCode() == null
            ? ""
            : ticket.getSeat().getSeatCode();
    return "CINEMAHUB|BOOKING="
        + booking.getBookingCode()
        + "|TICKET="
        + ticket.getId()
        + "|SEAT="
        + seatCode;
  }

  private String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }

  private User getUserCurrent() {
    String username =
        Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
    return userRepository
        .findByUsername(username)
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }

  private String generateBookingCode() {
    // Format: BK-YYYYMMDD-XXXXXX (6 random characters)
    String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
    String randomPart = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    return "BK-" + timestamp + "-" + randomPart;
  }

  private Booking getBooking(Long bookingId) {
    return bookingRepository
        .findById(bookingId)
        .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
  }

  private Map<Long, Integer> getFoodQuantities(List<CreateBookingFoodRequest> foods) {
    if (foods == null || foods.isEmpty()) {
      return Map.of();
    }

    Set<Long> uniqueFoodIds = new HashSet<>();
    for (CreateBookingFoodRequest food : foods) {
      if (food.getFoodId() == null || food.getQuantity() == null || food.getQuantity() <= 0) {
        throw new AppException(ErrorCode.VALIDATION_ERROR);
      }
      if (!uniqueFoodIds.add(food.getFoodId())) {
        throw new AppException(ErrorCode.VALIDATION_ERROR);
      }
    }

    return foods.stream()
        .collect(
            Collectors.toMap(
                CreateBookingFoodRequest::getFoodId, CreateBookingFoodRequest::getQuantity));
  }

  private List<Food> getSelectedFoods(Map<Long, Integer> foodQuantities) {
    if (foodQuantities.isEmpty()) {
      return List.of();
    }

    List<Food> selectedFoods = foodRepository.findAllById(foodQuantities.keySet());
    boolean hasUnavailableFood =
        selectedFoods.size() != foodQuantities.size()
            || selectedFoods.stream().anyMatch(food -> !Boolean.TRUE.equals(food.getActive()));

    if (hasUnavailableFood) {
      throw new AppException(ErrorCode.FOOD_NOT_FOUND);
    }

    return selectedFoods;
  }

  private BigDecimal calculateFoodTotal(
      List<Food> selectedFoods, Map<Long, Integer> foodQuantities) {
    return selectedFoods.stream()
        .map(food -> food.getPrice().multiply(BigDecimal.valueOf(foodQuantities.get(food.getId()))))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private List<BookingFood> buildBookingFoods(
      Booking booking, List<Food> selectedFoods, Map<Long, Integer> foodQuantities) {
    return selectedFoods.stream()
        .map(
            food -> {
              Integer quantity = foodQuantities.get(food.getId());
              BigDecimal subtotal = food.getPrice().multiply(BigDecimal.valueOf(quantity));
              return BookingFood.builder()
                  .booking(booking)
                  .food(food)
                  .quantity(quantity)
                  .unitPrice(food.getPrice())
                  .subtotal(subtotal)
                  .build();
            })
        .collect(Collectors.toCollection(ArrayList::new));
  }
}
