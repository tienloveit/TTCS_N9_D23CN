package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateBookingRequest;
import com.ltweb.backend.dto.request.StaffBookingRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.dto.response.SeatStatusEvent;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.Payment;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.AuditAction;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.event.BookingPaidEvent;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingCheckoutService {
  private final CurrentUserProvider currentUserProvider;
  private final BookingAccessPolicy bookingAccessPolicy;
  private final BookingPricingService bookingPricingService;
  private final StaffCustomerService staffCustomerService;
  private final java.time.Clock clock;
  private static final int DEFAULT_BOOKING_HOLD_MINUTES = 6;
  private final BookingRepository bookingRepository;
  private final ShowtimeRepository showtimeRepository;
  private final TicketRepository ticketRepository;
  private final RedisTemplate<String, String> redisTemplate;
  private final SimpMessagingTemplate simpMessagingTemplate;
  private final BookingMapper bookingMapper;
  private final ApplicationEventPublisher eventPublisher;
  private final AuditLogService auditLogService;
  private final SystemSettingService systemSettingService;
  private final FoodStockService foodStockService;

  @Transactional
  public BookingResponse createBooking(CreateBookingRequest request) {
    // người dùng hiện tại
    User user = getUserCurrent();

    // Kiểm tra số lượng vé trong 1 lần giao dịch không vượt quá 8
    int requestedCount = request.getSeatIds().size();
    if (requestedCount > getMaxTicketsPerTransaction()) {
      throw new AppException(ErrorCode.MAX_TICKET_PER_TRANSACTION);
    }

    Showtime showtime =
        showtimeRepository
            .findById(request.getShowtimeId())
            .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));

    requireBookableShowtime(showtime);

    Set<Long> uniqueSeatIds = new HashSet<>(request.getSeatIds());
    if (uniqueSeatIds.size() != request.getSeatIds().size()) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }

    List<Ticket> selectedTickets =
        ticketRepository.findSeatsForUpdate(showtime.getId(), request.getSeatIds());
    if (selectedTickets.size() != uniqueSeatIds.size()) {
      throw new AppException(ErrorCode.TICKET_NOT_FOUND);
    }

    boolean hasUnavailableTicket =
        selectedTickets.stream()
            .anyMatch(ticket -> ticket.getTicketStatus() != TicketStatus.AVAILABLE);

    if (hasUnavailableTicket) {
      throw new AppException(ErrorCode.TICKET_NOT_AVAILABLE);
    }

    Map<Long, Integer> foodQuantities = bookingPricingService.getFoodQuantities(request.getFoods());
    List<Food> selectedFoods = bookingPricingService.getSelectedFoods(foodQuantities);
    bookingPricingService.requireFoodsAvailableForShowtime(selectedFoods, showtime);
    foodStockService.reserve(selectedFoods, foodQuantities);

    int holdMinutes = getBookingHoldMinutes();

    BookingPricingService.Price price =
        bookingPricingService.price(
            selectedTickets,
            selectedFoods,
            foodQuantities,
            request.getPromotionCode(),
            user.getId(),
            bookingAccessPolicy.branchId(showtime));
    BigDecimal totalAmount = price.totalAmount();
    BigDecimal discountAmount = price.discountAmount();
    String appliedPromoCode = price.promotionCode();

    String bookingCode = generateBookingCode();
    BookingTransactionEffects.acquire(
        redisTemplate, showtime.getId(), selectedTickets, bookingCode, holdMinutes);
    Booking booking =
        Booking.builder()
            .bookingCode(bookingCode)
            .user(user)
            .showtime(showtime)
            .totalAmount(totalAmount)
            .promotionCode(appliedPromoCode)
            .discountAmount(discountAmount)
            .status(BookingStatus.PENDING)
            .payment(
                Payment.builder()
                    .amount(totalAmount)
                    .paymentCreatedAt(LocalDateTime.now(clock))
                    .paymentStatus(PaymentStatus.PENDING)
                    .build())
            .expiresAt(LocalDateTime.now(clock).plusMinutes(holdMinutes))
            .build();
    booking.setBookingFoods(
        bookingPricingService.buildBookingFoods(booking, selectedFoods, foodQuantities));

    bookingRepository.save(booking);

    selectedTickets.forEach(
        ticket -> {
          ticket.setBooking(booking);
          ticket.setTicketStatus(TicketStatus.HOLDING);
        });
    ticketRepository.saveAll(selectedTickets);
    selectedTickets.forEach(ticket -> broadcastSeat(showtime.getId(), ticket, "HOLDING"));
    booking.getTickets().addAll(selectedTickets);

    log.info("Booking created with code: {} for user: {}", bookingCode, user.getUsername());

    return bookingMapper.toBookingResponse(booking);
  }

  @Transactional
  public BookingResponse createStaffBooking(StaffBookingRequest request) {
    // Kiểm tra số lượng vé trong 1 lần giao dịch không vượt quá 8
    int requestedCount = request.getSeatIds().size();
    if (requestedCount > getMaxTicketsPerTransaction()) {
      throw new AppException(ErrorCode.MAX_TICKET_PER_TRANSACTION);
    }

    Showtime showtime =
        showtimeRepository
            .findById(request.getShowtimeId())
            .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
    requireStaffBookingAccess(showtime);
    requireBookableShowtime(showtime);
    User staffUser = getUserCurrent();

    Set<Long> uniqueSeatIds = new HashSet<>(request.getSeatIds());
    if (uniqueSeatIds.size() != request.getSeatIds().size()) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }

    List<Ticket> selectedTickets =
        ticketRepository.findSeatsForUpdate(showtime.getId(), request.getSeatIds());
    if (selectedTickets.size() != uniqueSeatIds.size()) {
      throw new AppException(ErrorCode.TICKET_NOT_FOUND);
    }

    boolean hasUnavailableTicket =
        selectedTickets.stream()
            .anyMatch(
                ticket ->
                    ticket.getTicketStatus() != TicketStatus.AVAILABLE
                        || hasActiveSeatHold(showtime.getId(), ticket));
    if (hasUnavailableTicket) {
      throw new AppException(ErrorCode.TICKET_NOT_AVAILABLE);
    }

    Map<Long, Integer> foodQuantities = bookingPricingService.getFoodQuantities(request.getFoods());
    List<Food> selectedFoods = bookingPricingService.getSelectedFoods(foodQuantities);
    bookingPricingService.requireFoodsAvailableForShowtime(selectedFoods, showtime);
    foodStockService.reserve(selectedFoods, foodQuantities);

    User customer = staffCustomerService.getOrCreateStaffCustomer(request);

    BookingPricingService.Price price =
        bookingPricingService.price(
            selectedTickets,
            selectedFoods,
            foodQuantities,
            request.getPromotionCode(),
            customer.getId(),
            bookingAccessPolicy.branchId(showtime));
    BigDecimal totalAmount = price.totalAmount();
    BigDecimal discountAmount = price.discountAmount();
    String appliedPromoCode = price.promotionCode();

    LocalDateTime now = LocalDateTime.now(clock);
    Booking booking =
        Booking.builder()
            .bookingCode(generateBookingCode())
            .user(customer)
            .staffUser(staffUser)
            .showtime(showtime)
            .totalAmount(totalAmount)
            .promotionCode(appliedPromoCode)
            .discountAmount(discountAmount)
            .status(
                request.getPaymentMethod() != null
                        && request.getPaymentMethod() != PaymentMethod.CASH
                    ? BookingStatus.PENDING
                    : BookingStatus.COMPLETED)
            .payment(
                Payment.builder()
                    .amount(totalAmount)
                    .paymentCreatedAt(now)
                    .paymentStatus(
                        request.getPaymentMethod() != null
                                && request.getPaymentMethod() != PaymentMethod.CASH
                            ? PaymentStatus.PENDING
                            : PaymentStatus.PAID)
                    .paymentMethod(
                        request.getPaymentMethod() == null
                            ? PaymentMethod.CASH
                            : request.getPaymentMethod())
                    .paidAt(
                        request.getPaymentMethod() != null
                                && request.getPaymentMethod() != PaymentMethod.CASH
                            ? null
                            : now)
                    .build())
            .expiresAt(now.plusMinutes(getBookingHoldMinutes()))
            .build();
    booking.setBookingFoods(
        bookingPricingService.buildBookingFoods(booking, selectedFoods, foodQuantities));

    bookingRepository.save(booking);

    selectedTickets.forEach(
        ticket -> {
          ticket.setBooking(booking);
          ticket.setTicketStatus(
              request.getPaymentMethod() != null && request.getPaymentMethod() != PaymentMethod.CASH
                  ? TicketStatus.HOLDING
                  : TicketStatus.BOOKED);
          if (request.getPaymentMethod() == null
              || request.getPaymentMethod() == PaymentMethod.CASH) {
            ticket.setQrCode(getOrCreateTicketQrCode(booking, ticket));
          }
          ticketRepository.save(ticket);
          String wsStatus =
              request.getPaymentMethod() != null && request.getPaymentMethod() != PaymentMethod.CASH
                  ? "HOLDING"
                  : "BOOKED";
          BookingTransactionEffects.afterCommit(
              () ->
                  simpMessagingTemplate.convertAndSend(
                      "/topic/showtime/" + showtime.getId() + "/seats",
                      SeatStatusEvent.builder()
                          .seatId(ticket.getSeat().getId())
                          .status(wsStatus)
                          .build()));
        });
    booking.getTickets().addAll(selectedTickets);
    if (request.getPaymentMethod() == null || request.getPaymentMethod() == PaymentMethod.CASH) {
      BookingTransactionEffects.releaseAfterCommit(
          redisTemplate, showtime.getId(), selectedTickets, booking.getBookingCode());
      eventPublisher.publishEvent(new BookingPaidEvent(booking.getId()));
    }

    log.info("Staff booking created with code: {}", booking.getBookingCode());
    auditLogService.record(
        AuditAction.STAFF_BOOKING_CREATED,
        "Booking",
        booking.getId(),
        "Staff booking "
            + booking.getBookingCode()
            + " created with "
            + selectedTickets.size()
            + " tickets");
    return bookingMapper.toBookingResponse(booking);
  }

  private String getSeatKey(Long showTimeId, Long seatId) {
    return "seat_hold:" + showTimeId + ":" + seatId;
  }

  private boolean hasActiveSeatHold(Long showtimeId, Ticket ticket) {
    return Boolean.TRUE.equals(
        redisTemplate.hasKey(getSeatKey(showtimeId, ticket.getSeat().getId())));
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

  private User getUserCurrent() {
    return currentUserProvider.requireUser();
  }

  private String generateBookingCode() {
    // Format: BK-YYYYMMDD-XXXXXX (6 random characters)
    String timestamp = LocalDateTime.now(clock).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
    String randomPart = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    return "BK-" + timestamp + "-" + randomPart;
  }

  private void requireBookableShowtime(Showtime showtime) {
    if (showtime.getStatus() != com.ltweb.backend.enums.ShowtimeStatus.OPEN
        || showtime.getStartTime() == null
        || !showtime.getStartTime().isAfter(LocalDateTime.now(clock))
        || showtime.getMovie() == null
        || !Boolean.TRUE.equals(showtime.getMovie().getIsPublic())
        || showtime.getRoom() == null
        || showtime.getRoom().getStatus() != com.ltweb.backend.enums.RoomStatus.ACTIVE
        || showtime.getRoom().getBranch() == null
        || showtime.getRoom().getBranch().getStatus()
            != com.ltweb.backend.enums.BranchStatus.ACTIVE) {
      throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
    }
  }

  private void broadcastSeat(Long showtimeId, Ticket ticket, String status) {
    BookingTransactionEffects.afterCommit(
        () ->
            simpMessagingTemplate.convertAndSend(
                "/topic/showtime/" + showtimeId + "/seats",
                SeatStatusEvent.builder().seatId(ticket.getSeat().getId()).status(status).build()));
  }

  private void requireStaffBookingAccess(Showtime showtime) {
    bookingAccessPolicy.requireCanCreateAtCounter(showtime, getUserCurrent());
  }

  private int getBookingHoldMinutes() {
    return Math.max(
        1,
        systemSettingService.getInt(
            SystemSettingService.BOOKING_HOLD_MINUTES, DEFAULT_BOOKING_HOLD_MINUTES));
  }

  private int getMaxTicketsPerTransaction() {
    return Math.max(
        1,
        systemSettingService.getInt(SystemSettingService.BOOKING_MAX_TICKETS_PER_TRANSACTION, 8));
  }
}
