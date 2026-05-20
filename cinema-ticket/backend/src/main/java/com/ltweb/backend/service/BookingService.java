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
import com.ltweb.backend.enums.AuditAction;
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

  private static final int MAX_TICKETS_PER_MOVIE = 8;

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
  private final PromotionService promotionService;
  private final FoodInventoryService foodInventoryService;
  private final AuditLogService auditLogService;

  @Transactional
  public BookingResponse createBooking(CreateBookingRequest request) {
    // người dùng hiện tại
    User user = getUserCurrent();

    // Kiểm tra số lượng vé trong 1 lần giao dịch không vượt quá 8
    int requestedCount = request.getSeatIds().size();
    if (requestedCount > MAX_TICKETS_PER_MOVIE) {
      throw new AppException(ErrorCode.MAX_TICKET_PER_TRANSACTION);
    }

    Showtime showtime =
        showtimeRepository
            .findById(request.getShowtimeId())
            .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));

    // Kiểm tra tổng số vé người dùng đã đặt cho bộ phim này không vượt quá 8
    Long movieId = showtime.getMovie().getId();
    int alreadyBooked = ticketRepository.countTicketsByUserAndMovie(user.getId(), movieId);
    if (alreadyBooked + requestedCount > MAX_TICKETS_PER_MOVIE) {
      throw new AppException(ErrorCode.MAX_TICKET_PER_MOVIE);
    }

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
                        || Boolean.FALSE.equals(ticket.getSeat().getIsActive()));

    if (hasUnavailableTicket) {
      throw new AppException(ErrorCode.TICKET_NOT_AVAILABLE);
    }

    Map<Long, Integer> foodQuantities = getFoodQuantities(request.getFoods());
    List<Food> selectedFoods = getSelectedFoods(foodQuantities);
    requireFoodsAvailableForShowtime(selectedFoods, showtime);
    foodInventoryService.requireAvailable(selectedFoods, foodQuantities);
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

    // Áp dụng mã giảm giá nếu có
    BigDecimal discountAmount = BigDecimal.ZERO;
    String appliedPromoCode = null;
    if (request.getPromotionCode() != null && !request.getPromotionCode().isBlank()) {
      Long branchId = showtime.getRoom().getBranch().getBranchId();
      discountAmount =
          promotionService.validatePromotion(
              request.getPromotionCode(), totalAmount, user.getId(), branchId);
      appliedPromoCode = request.getPromotionCode().trim().toUpperCase();
      totalAmount = totalAmount.subtract(discountAmount);
      if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
        totalAmount = BigDecimal.ZERO;
      }
    }

    String bookingCode = generateBookingCode();
    Booking booking =
        Booking.builder()
            .bookingCode(bookingCode)
            .user(user)
            .showtime(showtime)
            .totalAmount(totalAmount)
            .promotionCode(appliedPromoCode)
            .discountAmount(discountAmount)
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
    // Kiểm tra số lượng vé trong 1 lần giao dịch không vượt quá 8
    int requestedCount = request.getSeatIds().size();
    if (requestedCount > MAX_TICKETS_PER_MOVIE) {
      throw new AppException(ErrorCode.MAX_TICKET_PER_TRANSACTION);
    }

    Showtime showtime =
        showtimeRepository
            .findById(request.getShowtimeId())
            .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
    requireStaffBookingAccess(showtime);
    User staffUser = getUserCurrent();

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
                        || Boolean.FALSE.equals(ticket.getSeat().getIsActive())
                        || hasActiveSeatHold(showtime.getId(), ticket));
    if (hasUnavailableTicket) {
      throw new AppException(ErrorCode.TICKET_NOT_AVAILABLE);
    }

    Map<Long, Integer> foodQuantities = getFoodQuantities(request.getFoods());
    List<Food> selectedFoods = getSelectedFoods(foodQuantities);
    requireFoodsAvailableForShowtime(selectedFoods, showtime);
    foodInventoryService.requireAvailable(selectedFoods, foodQuantities);
    BigDecimal foodTotal = calculateFoodTotal(selectedFoods, foodQuantities);
    BigDecimal ticketTotal =
        selectedTickets.stream().map(Ticket::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);

    User customer = getOrCreateStaffCustomer(request);

    // Kiểm tra tổng số vé khách hàng đã đặt cho bộ phim này không vượt quá 8
    Long movieId = showtime.getMovie().getId();
    int alreadyBooked = ticketRepository.countTicketsByUserAndMovie(customer.getId(), movieId);
    if (alreadyBooked + requestedCount > MAX_TICKETS_PER_MOVIE) {
      throw new AppException(ErrorCode.MAX_TICKET_PER_MOVIE);
    }

    BigDecimal totalAmount = ticketTotal.add(foodTotal);

    // Áp dụng mã giảm giá (cả CASH và CARD)
    BigDecimal discountAmount = BigDecimal.ZERO;
    String appliedPromoCode = null;
    if (request.getPromotionCode() != null && !request.getPromotionCode().isBlank()) {
      Long branchId = showtime.getRoom().getBranch().getBranchId();
      discountAmount = promotionService.validatePromotion(
          request.getPromotionCode(), totalAmount, customer.getId(), branchId);
      appliedPromoCode = request.getPromotionCode().trim().toUpperCase();
      totalAmount = totalAmount.subtract(discountAmount);
      if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
        totalAmount = BigDecimal.ZERO;
      }
    }

    LocalDateTime now = LocalDateTime.now();
    Booking booking =
        Booking.builder()
            .bookingCode(generateBookingCode())
            .user(customer)
            .staffUser(staffUser)
            .showtime(showtime)
            .totalAmount(totalAmount)
            .promotionCode(appliedPromoCode)
            .discountAmount(discountAmount)
            .status(request.getPaymentMethod() == PaymentMethod.CARD ? BookingStatus.PENDING : BookingStatus.COMPLETED)
            .paymentCreatedAt(now)
            .paymentStatus(request.getPaymentMethod() == PaymentMethod.CARD ? PaymentStatus.PENDING : PaymentStatus.PAID)
            .paymentMethod(request.getPaymentMethod() == null ? PaymentMethod.CASH : request.getPaymentMethod())
            .paidAt(request.getPaymentMethod() == PaymentMethod.CARD ? null : now)
            .expiresAt(now.plusMinutes(6))
            .build();
    booking.setBookingFoods(buildBookingFoods(booking, selectedFoods, foodQuantities));

    bookingRepository.save(booking);
    if (request.getPaymentMethod() != PaymentMethod.CARD) {
      foodInventoryService.deductForBooking(booking);
    }

    selectedTickets.forEach(
        ticket -> {
          ticket.setBooking(booking);
          ticket.setTicketStatus(request.getPaymentMethod() == PaymentMethod.CARD ? TicketStatus.HOLDING : TicketStatus.BOOKED);
          if (request.getPaymentMethod() != PaymentMethod.CARD) {
            ticket.setQrCode(getOrCreateTicketQrCode(booking, ticket));
          }
          ticketRepository.save(ticket);
          String wsStatus = request.getPaymentMethod() == PaymentMethod.CARD ? "HOLDING" : "BOOKED";
          simpMessagingTemplate.convertAndSend(
              "/topic/showtime/" + showtime.getId() + "/seats",
              SeatStatusEvent.builder().seatId(ticket.getSeat().getId()).status(wsStatus).build());
        });
    booking.setTickets(selectedTickets);
    if (request.getPaymentMethod() != PaymentMethod.CARD) {
      unlockSeats(showtime.getId(), selectedTickets);
      eventPublisher.publishEvent(new BookingPaidEvent(booking.getId()));
    }

    log.info("Staff booking created with code: {}", booking.getBookingCode());
    auditLogService.record(
        AuditAction.STAFF_BOOKING_CREATED,
        "Booking",
        booking.getId(),
        "Staff booking " + booking.getBookingCode() + " created with " + selectedTickets.size() + " tickets");
    return bookingMapper.toBookingResponse(booking);
  }

  @PreAuthorize("hasAnyRole('ADMIN','STAFF','MANAGER')")
  @Transactional(readOnly = true)
  public List<BookingResponse> getAllBookings() {
    return scopeBookingsForBranchOperator(bookingRepository.findAll()).stream()
        .map(bookingMapper::toBookingResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public BookingResponse getBookingById(Long bookingId) {
    Booking booking = getBooking(bookingId);
    User user = getUserCurrent();
    boolean isOwner = booking.getUser().getId().equals(user.getId());
    boolean isAdmin = user.getRole() == UserRole.ADMIN;
    boolean isBranchManager =
        isBranchOperator(user)
            && user.getBranchId() != null
            && isBookingInBranch(booking, user.getBranchId());
    if (!isOwner && !isAdmin && !isBranchManager) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }
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

  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  @Transactional
  public BookingResponse updateBooking(Long bookingId, UpdateBookingRequest request) {
    Booking booking = getBooking(bookingId);
    requireBookingManagementAccess(booking);

    if (request.getStatus() != null) {
      booking.setStatus(request.getStatus());
    }

    return bookingMapper.toBookingResponse(bookingRepository.save(booking));
  }

  @Transactional
  public void cancelBooking(Long bookingId) {
    Booking booking = getBooking(bookingId);
    User user = getUserCurrent();
    boolean isOwner = booking.getUser().getId().equals(user.getId());
    boolean canManageBooking =
        user.getRole() == UserRole.ADMIN
            || (user.getRole() == UserRole.STAFF
                && user.getBranchId() != null
                && isBookingInBranch(booking, user.getBranchId()));
    if (!isOwner && !canManageBooking) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

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

  /**
   * Áp dụng hoặc xóa mã khuyến mại cho booking đang PENDING.
   * Tính lại totalAmount từ giá gốc (trước giảm giá) để tránh stacking discount.
   */
  @Transactional
  public BookingResponse applyPromotion(Long bookingId, String promotionCode) {
    Booking booking = getBooking(bookingId);
    User user = getUserCurrent();

    // Chỉ chủ booking mới được áp mã
    if (!booking.getUser().getId().equals(user.getId())) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    // Chỉ áp dụng cho booking PENDING (chưa thanh toán)
    if (booking.getStatus() != BookingStatus.PENDING) {
      throw new AppException(ErrorCode.INVALID_PAYMENT_STATUS);
    }

    // Tính lại giá gốc (cộng lại discount cũ nếu có)
    BigDecimal originalAmount = booking.getTotalAmount()
        .add(booking.getDiscountAmount() != null ? booking.getDiscountAmount() : BigDecimal.ZERO);

    if (promotionCode == null || promotionCode.isBlank()) {
      // Xóa mã — khôi phục giá gốc
      booking.setPromotionCode(null);
      booking.setDiscountAmount(BigDecimal.ZERO);
      booking.setTotalAmount(originalAmount);
    } else {
      // Áp mã mới
      Long branchId = booking.getShowtime().getRoom().getBranch().getBranchId();
      BigDecimal discountAmount = promotionService.validatePromotion(
          promotionCode, originalAmount, user.getId(), branchId);
      BigDecimal newTotal = originalAmount.subtract(discountAmount);
      if (newTotal.compareTo(BigDecimal.ZERO) < 0) newTotal = BigDecimal.ZERO;

      booking.setPromotionCode(promotionCode.trim().toUpperCase());
      booking.setDiscountAmount(discountAmount);
      booking.setTotalAmount(newTotal);
    }

    bookingRepository.save(booking);
    log.info("Promotion {} applied to booking {}", promotionCode, bookingId);
    return bookingMapper.toBookingResponse(booking);
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

  private List<Booking> scopeBookingsForBranchOperator(List<Booking> bookings) {
    User currentUser = getUserCurrent();
    if (currentUser.getRole() == UserRole.ADMIN) {
      return bookings;
    }
    if (!isBranchOperator(currentUser)) {
      return List.of();
    }
    Long branchId = currentUser.getBranchId();
    if (branchId == null) {
      return List.of();
    }
    return bookings.stream().filter(booking -> isBookingInBranch(booking, branchId)).toList();
  }

  private boolean isBookingInBranch(Booking booking, Long branchId) {
    return booking.getShowtime() != null
        && booking.getShowtime().getRoom() != null
        && booking.getShowtime().getRoom().getBranch() != null
        && Objects.equals(booking.getShowtime().getRoom().getBranch().getBranchId(), branchId);
  }

  private void requireBookingManagementAccess(Booking booking) {
    User currentUser = getUserCurrent();
    if (currentUser.getRole() == UserRole.ADMIN) {
      return;
    }
    if (isBranchOperator(currentUser)
        && currentUser.getBranchId() != null
        && isBookingInBranch(booking, currentUser.getBranchId())) {
      return;
    }
    throw new AppException(ErrorCode.UNAUTHORIZED);
  }

  private void requireRefundManagementAccess(Booking booking) {
    User currentUser = getUserCurrent();
    if (currentUser.getRole() == UserRole.ADMIN) {
      return;
    }
    if (currentUser.getRole() == UserRole.MANAGER
        && currentUser.getBranchId() != null
        && isBookingInBranch(booking, currentUser.getBranchId())) {
      return;
    }
    throw new AppException(ErrorCode.UNAUTHORIZED);
  }

  private void requireStaffBookingAccess(Showtime showtime) {
    User currentUser = getUserCurrent();
    if (currentUser.getRole() == UserRole.ADMIN) {
      return;
    }
    if (currentUser.getRole() == UserRole.STAFF
        && currentUser.getBranchId() != null
        && showtime.getRoom() != null
        && showtime.getRoom().getBranch() != null
        && Objects.equals(showtime.getRoom().getBranch().getBranchId(), currentUser.getBranchId())) {
      return;
    }
    throw new AppException(ErrorCode.UNAUTHORIZED);
  }

  private boolean isBranchOperator(User user) {
    return user.getRole() == UserRole.STAFF || user.getRole() == UserRole.MANAGER;
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

  private void requireFoodsAvailableForShowtime(List<Food> foods, Showtime showtime) {
    if (foods.isEmpty()) {
      return;
    }
    Long branchId =
        showtime.getRoom() == null || showtime.getRoom().getBranch() == null
            ? null
            : showtime.getRoom().getBranch().getBranchId();
    boolean hasFoodFromOtherBranch =
        foods.stream()
            .anyMatch(
                food -> food.getBranchId() != null && !Objects.equals(food.getBranchId(), branchId));
    if (hasFoodFromOtherBranch) {
      throw new AppException(ErrorCode.FOOD_NOT_FOUND);
    }
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

  /**
   * Cộng tổng chi tiêu và nâng hạng thành viên sau khi thanh toán thành công.
   */
  @Transactional
  public void updateMembershipAfterPayment(Long bookingId) {
    Booking booking = getBooking(bookingId);
    User user = booking.getUser();
    if (user == null) return;

    BigDecimal currentSpending =
        user.getTotalSpending() != null ? user.getTotalSpending() : BigDecimal.ZERO;
    user.setTotalSpending(currentSpending.add(booking.getTotalAmount()));
    user.setMembershipTier(
        com.ltweb.backend.enums.MembershipTier.fromSpending(user.getTotalSpending()));
    userRepository.save(user);

    // Tăng usedCount của promotion nếu có
    if (booking.getPromotionCode() != null) {
      promotionService.incrementUsage(booking.getPromotionCode());
    }

    log.info(
        "Updated membership for user {}: spending={}, tier={}",
        user.getUsername(),
        user.getTotalSpending(),
        user.getMembershipTier());
  }

  // ===== REFUND =====
  private static final int REFUND_WINDOW_HOURS = 24;

  /**
   * User yêu cầu hoàn tiền.
   * Chỉ cho phép trong vòng 24 giờ sau khi thanh toán, booking phải ở trạng thái COMPLETED.
   */
  @Transactional
  public BookingResponse requestRefund(Long bookingId, String reason) {
    Booking booking = getBooking(bookingId);
    User user = getUserCurrent();

    // Chỉ chủ booking mới được yêu cầu hoàn tiền
    if (!booking.getUser().getId().equals(user.getId())) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    // Kiểm tra trạng thái
    if (booking.getStatus() == BookingStatus.REFUND_REQUESTED) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    }
    if (booking.getStatus() == BookingStatus.REFUNDED) {
      throw new AppException(ErrorCode.BOOKING_ALREADY_REFUNDED);
    }
    if (booking.getStatus() != BookingStatus.COMPLETED) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    }

    // Kiểm tra cửa sổ hoàn tiền: trong vòng 24h sau khi thanh toán
    LocalDateTime paidAt = booking.getPaidAt();
    if (paidAt == null) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    }
    if (LocalDateTime.now().isAfter(paidAt.plusHours(REFUND_WINDOW_HOURS))) {
      throw new AppException(ErrorCode.REFUND_WINDOW_EXPIRED);
    }

    booking.setStatus(BookingStatus.REFUND_REQUESTED);
    booking.setRefundReason(reason);
    booking.setRefundAmount(booking.getTotalAmount());
    bookingRepository.save(booking);

    log.info("Refund requested for booking {}: reason={}", bookingId, reason);
    return bookingMapper.toBookingResponse(booking);
  }

  /**
   * Admin/Manager duyệt hoặc từ chối yêu cầu hoàn tiền.
   */
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  @Transactional
  public BookingResponse processRefund(Long bookingId, boolean approved) {
    Booking booking = getBooking(bookingId);
    requireRefundManagementAccess(booking);

    if (booking.getStatus() != BookingStatus.REFUND_REQUESTED) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    }

    if (approved) {
      booking.setStatus(BookingStatus.REFUNDED);
      booking.setPaymentStatus(PaymentStatus.REFUNDED);
      booking.setRefundedAt(LocalDateTime.now());
      booking.setRefundAmount(booking.getTotalAmount());
      foodInventoryService.restoreForBooking(booking);

      // Trả ghế về AVAILABLE
      booking
          .getTickets()
          .forEach(
              ticket -> {
                ticket.setBooking(null);
                ticket.setTicketStatus(TicketStatus.AVAILABLE);
                ticket.setQrCode(null);
                ticketRepository.save(ticket);

                simpMessagingTemplate.convertAndSend(
                    "/topic/showtime/" + booking.getShowtime().getId() + "/seats",
                    SeatStatusEvent.builder()
                        .seatId(ticket.getSeat().getId())
                        .status("AVAILABLE")
                        .build());
              });

      // Trừ lại spending nếu cần
      User user = booking.getUser();
      if (user != null && user.getTotalSpending() != null) {
        BigDecimal newSpending = user.getTotalSpending().subtract(booking.getTotalAmount());
        if (newSpending.compareTo(BigDecimal.ZERO) < 0) newSpending = BigDecimal.ZERO;
        user.setTotalSpending(newSpending);
        user.setMembershipTier(
            com.ltweb.backend.enums.MembershipTier.fromSpending(user.getTotalSpending()));
        userRepository.save(user);
      }

      log.info("Refund APPROVED for booking {}", bookingId);
      auditLogService.record(
          AuditAction.REFUND_APPROVED,
          "Booking",
          bookingId,
          "Refund approved for booking " + booking.getBookingCode());
    } else {
      // Từ chối → quay lại COMPLETED
      booking.setStatus(BookingStatus.COMPLETED);
      booking.setRefundReason(null);
      booking.setRefundAmount(BigDecimal.ZERO);

      log.info("Refund REJECTED for booking {}", bookingId);
      auditLogService.record(
          AuditAction.REFUND_REJECTED,
          "Booking",
          bookingId,
          "Refund rejected for booking " + booking.getBookingCode());
    }

    bookingRepository.save(booking);
    return bookingMapper.toBookingResponse(booking);
  }
}

