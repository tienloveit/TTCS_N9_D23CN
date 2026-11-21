package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateBookingFoodRequest;
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
import com.ltweb.backend.enums.BranchStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.enums.ShowtimeStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.event.BookingPaidEvent;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
  private static final int DEFAULT_BOOKING_HOLD_MINUTES = 6;
  private static final int DEFAULT_MAX_TICKETS_PER_TRANSACTION = 8;
  private static final int DEFAULT_MAX_PENDING_PER_USER = 2;

  /**
   * Quầy được bán vé tới 15 phút sau giờ chiếu (khách đến muộn). Khớp với điều kiện hiển thị suất
   * trong `frontend/src/pages/Staff/booking/StaffBookingPage.jsx` (isShowtimeAvailable).
   */
  static final int STAFF_SALE_GRACE_MINUTES = 15;

  // Crockford base32: không có I, L, O, U nên dễ đọc khi khách đọc mã cho nhân viên.
  private static final char[] CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ".toCharArray();
  private static final int CODE_RANDOM_LENGTH = 8;
  private static final int CODE_ATTEMPTS = 5;
  private static final SecureRandom RANDOM = new SecureRandom();

  private final CurrentUserProvider currentUserProvider;
  private final BookingAccessPolicy bookingAccessPolicy;
  private final BookingPricingService bookingPricingService;
  private final StaffCustomerService staffCustomerService;
  private final Clock clock;
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
  private final PromotionService promotionService;

  @Transactional
  public BookingResponse createBooking(CreateBookingRequest request) {
    User user = currentUserProvider.requireUser();
    requireTicketCount(request.getSeatIds());
    Showtime showtime = getShowtime(request.getShowtimeId());
    requireBookableShowtime(showtime, 0);
    requirePendingCapacity(user);

    List<Ticket> tickets = lockAvailableTickets(showtime, request.getSeatIds(), false);
    Order order =
        prepareOrder(showtime, tickets, request.getFoods(), request.getPromotionCode(), user);

    int holdMinutes = getBookingHoldMinutes();
    LocalDateTime now = LocalDateTime.now(clock);
    String bookingCode = newBookingCode();
    BookingTransactionEffects.acquire(
        redisTemplate, showtime.getId(), tickets, bookingCode, holdMinutes);
    Booking booking =
        newBooking(bookingCode, user, showtime, order)
            .status(BookingStatus.PENDING)
            .payment(pendingPayment(order, now))
            .expiresAt(now.plusMinutes(holdMinutes))
            .build();
    attachFoods(booking, order);
    bookingRepository.save(booking);

    assignTickets(booking, tickets, TicketStatus.HOLDING);
    log.info("Booking created with code: {} for user: {}", bookingCode, user.getUsername());
    return bookingMapper.toBookingResponse(booking);
  }

  @Transactional
  public BookingResponse createStaffBooking(StaffBookingRequest request) {
    requireTicketCount(request.getSeatIds());
    Showtime showtime = getShowtime(request.getShowtimeId());
    User staffUser = currentUserProvider.requireUser();
    bookingAccessPolicy.requireCanCreateAtCounter(showtime, staffUser);
    requireBookableShowtime(showtime, STAFF_SALE_GRACE_MINUTES);

    List<Ticket> tickets = lockAvailableTickets(showtime, request.getSeatIds(), true);
    User customer = staffCustomerService.getOrCreateStaffCustomer(request);
    Order order =
        prepareOrder(showtime, tickets, request.getFoods(), request.getPromotionCode(), customer);

    // Tiền mặt (hoặc không chọn phương thức) hoàn tất ngay; phương thức khác chờ thanh toán.
    boolean cash =
        request.getPaymentMethod() == null || request.getPaymentMethod() == PaymentMethod.CASH;
    int holdMinutes = getBookingHoldMinutes();
    LocalDateTime now = LocalDateTime.now(clock);
    String bookingCode = newBookingCode();
    if (!cash) {
      // Giữ ghế ở Redis như đơn online để sơ đồ ghế hiển thị đúng trong lúc chờ thanh toán.
      BookingTransactionEffects.acquire(
          redisTemplate, showtime.getId(), tickets, bookingCode, holdMinutes);
    }
    Payment payment = pendingPayment(order, now);
    if (cash) {
      payment.setPaymentStatus(PaymentStatus.PAID);
      payment.setPaymentMethod(PaymentMethod.CASH);
      payment.setPaidAt(now);
    } else {
      payment.setPaymentMethod(request.getPaymentMethod());
    }
    Booking booking =
        newBooking(bookingCode, customer, showtime, order)
            .staffUser(staffUser)
            .status(cash ? BookingStatus.COMPLETED : BookingStatus.PENDING)
            .payment(payment)
            .expiresAt(now.plusMinutes(holdMinutes))
            .build();
    attachFoods(booking, order);
    bookingRepository.save(booking);

    assignTickets(booking, tickets, cash ? TicketStatus.BOOKED : TicketStatus.HOLDING);
    if (cash) {
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
            + tickets.size()
            + " tickets");
    return bookingMapper.toBookingResponse(booking);
  }

  /** Giá, đồ ăn đã giữ tồn và khuyến mãi đã giữ lượt của một đơn đang tạo. */
  private record Order(
      BookingPricingService.Price price,
      List<Food> foods,
      Map<Long, Integer> foodQuantities,
      boolean promotionReserved) {}

  /** Giữ tồn bắp nước, tính giá phía server và giữ một lượt khuyến mãi (nếu có). */
  private Order prepareOrder(
      Showtime showtime,
      List<Ticket> tickets,
      List<CreateBookingFoodRequest> foods,
      String promotionCode,
      User customer) {
    Map<Long, Integer> foodQuantities = bookingPricingService.getFoodQuantities(foods);
    List<Food> selectedFoods = bookingPricingService.getSelectedFoods(foodQuantities);
    bookingPricingService.requireFoodsAvailableForShowtime(selectedFoods, showtime);
    foodStockService.reserve(selectedFoods, foodQuantities);

    BookingPricingService.Price price =
        bookingPricingService.price(
            tickets,
            selectedFoods,
            foodQuantities,
            promotionCode,
            customer.getId(),
            bookingAccessPolicy.branchId(showtime));
    boolean reserved = StringUtils.hasText(price.promotionCode());
    if (reserved) {
      // Nguyên tử ở DB: hai đơn đồng thời không thể cùng lấy lượt cuối cùng.
      promotionService.reserveUsage(price.promotionCode());
    }
    return new Order(price, selectedFoods, foodQuantities, reserved);
  }

  private Booking.BookingBuilder newBooking(
      String bookingCode, User customer, Showtime showtime, Order order) {
    return Booking.builder()
        .bookingCode(bookingCode)
        .user(customer)
        .showtime(showtime)
        .totalAmount(order.price().totalAmount())
        .promotionCode(order.price().promotionCode())
        .discountAmount(order.price().discountAmount())
        .promotionUsageReserved(order.promotionReserved() ? Boolean.TRUE : null);
  }

  private static Payment pendingPayment(Order order, LocalDateTime now) {
    return Payment.builder()
        .amount(order.price().totalAmount())
        .paymentCreatedAt(now)
        .paymentStatus(PaymentStatus.PENDING)
        .build();
  }

  private void attachFoods(Booking booking, Order order) {
    booking.setBookingFoods(
        bookingPricingService.buildBookingFoods(booking, order.foods(), order.foodQuantities()));
  }

  /** Gắn vé vào đơn, cấp QR cho vé đã bán và phát trạng thái ghế sau commit. */
  private void assignTickets(Booking booking, List<Ticket> tickets, TicketStatus status) {
    Long showtimeId = booking.getShowtime().getId();
    for (Ticket ticket : tickets) {
      ticket.setBooking(booking);
      ticket.setTicketStatus(status);
      if (status == TicketStatus.BOOKED) {
        ticket.setQrCode(getOrCreateTicketQrCode(booking, ticket));
      }
      Long seatId = ticket.getSeat().getId();
      BookingTransactionEffects.afterCommit(
          () ->
              simpMessagingTemplate.convertAndSend(
                  "/topic/showtime/" + showtimeId + "/seats",
                  SeatStatusEvent.builder().seatId(seatId).status(status.name()).build()));
    }
    ticketRepository.saveAll(tickets);
    booking.getTickets().addAll(tickets);
  }

  /**
   * Khóa các vé được chọn theo thứ tự id (tránh deadlock) và yêu cầu tất cả còn trống. Ở quầy kiểm
   * tra thêm khóa Redis vì khách online có thể đang giữ ghế.
   */
  private List<Ticket> lockAvailableTickets(
      Showtime showtime, List<Long> seatIds, boolean checkRedisHold) {
    Set<Long> uniqueSeatIds = new HashSet<>(seatIds);
    if (uniqueSeatIds.size() != seatIds.size() || uniqueSeatIds.contains(null)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }
    List<Ticket> tickets = ticketRepository.findSeatsForUpdate(showtime.getId(), seatIds);
    if (tickets.size() != uniqueSeatIds.size()) {
      throw new AppException(ErrorCode.TICKET_NOT_FOUND);
    }
    boolean unavailable =
        tickets.stream()
            .anyMatch(
                ticket ->
                    ticket.getTicketStatus() != TicketStatus.AVAILABLE
                        || (checkRedisHold && hasActiveSeatHold(showtime.getId(), ticket)));
    if (unavailable) {
      throw new AppException(ErrorCode.TICKET_NOT_AVAILABLE);
    }
    return tickets;
  }

  private void requireTicketCount(List<Long> seatIds) {
    if (seatIds.size() > getMaxTicketsPerTransaction()) {
      throw new AppException(ErrorCode.MAX_TICKET_PER_TRANSACTION);
    }
  }

  /** Giới hạn số đơn chờ thanh toán còn hạn để một tài khoản không giữ hết ghế của suất. */
  private void requirePendingCapacity(User user) {
    long pending =
        bookingRepository.countByUserIdAndStatusAndExpiresAtAfter(
            user.getId(), BookingStatus.PENDING, LocalDateTime.now(clock));
    if (pending >= getMaxPendingPerUser()) {
      throw new AppException(ErrorCode.BOOKING_PENDING_LIMIT);
    }
  }

  private Showtime getShowtime(Long showtimeId) {
    return showtimeRepository
        .findById(showtimeId)
        .orElseThrow(() -> new AppException(ErrorCode.SHOWTIME_NOT_FOUND));
  }

  /**
   * Suất còn mở bán: OPEN, phim công khai, phòng và rạp đang hoạt động, và chưa quá giờ chiếu cộng
   * {@code graceMinutes}.
   */
  private void requireBookableShowtime(Showtime showtime, int graceMinutes) {
    LocalDateTime saleEnds =
        showtime.getStartTime() == null ? null : showtime.getStartTime().plusMinutes(graceMinutes);
    if (showtime.getStatus() != ShowtimeStatus.OPEN
        || saleEnds == null
        || !saleEnds.isAfter(LocalDateTime.now(clock))
        || showtime.getMovie() == null
        || !Boolean.TRUE.equals(showtime.getMovie().getIsPublic())
        || showtime.getRoom() == null
        || showtime.getRoom().getStatus() != RoomStatus.ACTIVE
        || showtime.getRoom().getBranch() == null
        || showtime.getRoom().getBranch().getStatus() != BranchStatus.ACTIVE) {
      throw new AppException(ErrorCode.SHOWTIME_NOT_FOUND);
    }
  }

  private boolean hasActiveSeatHold(Long showtimeId, Ticket ticket) {
    return Boolean.TRUE.equals(
        redisTemplate.hasKey("seat_hold:" + showtimeId + ":" + ticket.getSeat().getId()));
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

  /**
   * Mã đơn BK-YYYYMMDD-XXXXXXXX với 8 ký tự base32 từ SecureRandom (~1,1 nghìn tỷ giá trị mỗi
   * ngày). Mã cũng dùng để check-in nên không được dễ đoán; trùng thì sinh lại.
   */
  String newBookingCode() {
    String date = LocalDateTime.now(clock).format(DateTimeFormatter.BASIC_ISO_DATE);
    for (int attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      StringBuilder code = new StringBuilder("BK-").append(date).append('-');
      for (int i = 0; i < CODE_RANDOM_LENGTH; i++) {
        code.append(CODE_ALPHABET[RANDOM.nextInt(CODE_ALPHABET.length)]);
      }
      if (!bookingRepository.existsByBookingCode(code.toString())) {
        return code.toString();
      }
    }
    throw new IllegalStateException("Could not generate a unique booking code");
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
        systemSettingService.getInt(
            SystemSettingService.BOOKING_MAX_TICKETS_PER_TRANSACTION,
            DEFAULT_MAX_TICKETS_PER_TRANSACTION));
  }

  private int getMaxPendingPerUser() {
    return Math.max(
        1,
        systemSettingService.getInt(
            SystemSettingService.BOOKING_MAX_PENDING_PER_USER, DEFAULT_MAX_PENDING_PER_USER));
  }
}
