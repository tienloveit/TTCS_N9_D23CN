package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.CreateBookingFoodRequest;
import com.ltweb.backend.dto.request.CreateBookingRequest;
import com.ltweb.backend.dto.request.StaffBookingRequest;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.event.BookingPaidEvent;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.*;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Quy tắc tạo/hủy đơn: giữ lượt khuyến mãi, giới hạn đơn chờ, bán tại quầy, mã đơn, số lượng. */
class BookingCheckoutRulesTest {
  private final BookingRepository bookings = mock(BookingRepository.class);
  private final PromotionService promotions = mock(PromotionService.class);
  private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
  private final ValueOperations<String, String> redisValues = mockValues();
  private final AtomicReference<Booking> saved = new AtomicReference<>();
  private Showtime showtime;
  private BookingService service;

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void onlineBookingReservesPromotionUsageAtCreation() {
    build(false, now().plusDays(1));
    when(promotions.validatePromotion(eq("SALE10"), any(), any(), any()))
        .thenReturn(new BigDecimal("7500"));

    service.createBooking(online("SALE10"));

    verify(promotions).reserveUsage("SALE10");
    assertThat(saved.get().getPromotionUsageReserved()).isTrue();
    assertThat(saved.get().getTotalAmount()).isEqualByComparingTo("67500");
  }

  @Test
  void exhaustedPromotionRejectsTheBookingBeforeAnythingIsSaved() {
    build(false, now().plusDays(1));
    when(promotions.validatePromotion(any(), any(), any(), any()))
        .thenReturn(new BigDecimal("7500"));
    doThrow(new AppException(ErrorCode.PROMOTION_USAGE_LIMIT))
        .when(promotions)
        .reserveUsage("SALE10");

    assertError(() -> service.createBooking(online("SALE10")), ErrorCode.PROMOTION_USAGE_LIMIT);
    verify(bookings, never()).save(any());
  }

  @Test
  void bookingWithoutPromotionDoesNotTouchUsage() {
    build(false, now().plusDays(1));
    service.createBooking(online(null));
    verify(promotions, never()).reserveUsage(any());
    assertThat(saved.get().getPromotionUsageReserved()).isNull();
  }

  @Test
  void customerCannotHoldMoreThanTheConfiguredNumberOfPendingBookings() {
    build(false, now().plusDays(1));
    when(bookings.countByUserIdAndStatusAndExpiresAtAfter(eq(1L), eq(BookingStatus.PENDING), any()))
        .thenReturn(2L);

    assertError(() -> service.createBooking(online(null)), ErrorCode.BOOKING_PENDING_LIMIT);
    verify(bookings, never()).save(any());
    verifyNoInteractions(redisValues);
  }

  @Test
  void onlineSalesStopAtShowtimeStartButTheCounterHasAGracePeriod() {
    LocalDateTime startedFiveMinutesAgo = now().minusMinutes(5);
    build(false, startedFiveMinutesAgo);
    assertError(() -> service.createBooking(online(null)), ErrorCode.SHOWTIME_NOT_FOUND);

    build(true, startedFiveMinutesAgo);
    assertThat(service.createStaffBooking(counter(PaymentMethod.CASH))).isNull();
    assertThat(saved.get().getStatus()).isEqualTo(BookingStatus.COMPLETED);

    build(true, now().minusMinutes(BookingCheckoutService.STAFF_SALE_GRACE_MINUTES));
    assertError(
        () -> service.createStaffBooking(counter(PaymentMethod.CASH)),
        ErrorCode.SHOWTIME_NOT_FOUND);
  }

  @Test
  void counterSaleAwaitingCardPaymentHoldsSeatsInRedis() {
    build(true, now().plusHours(2));
    service.createStaffBooking(counter(PaymentMethod.CARD));

    Booking booking = saved.get();
    assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING);
    assertThat(booking.getTickets()).allMatch(t -> t.getTicketStatus() == TicketStatus.HOLDING);
    verify(redisValues)
        .setIfAbsent(eq("seat_hold:1:1"), eq(booking.getBookingCode()), eq(6L), any());
    verify(events, never()).publishEvent(any(BookingPaidEvent.class));
  }

  @Test
  void cashCounterSaleCompletesWithoutTakingASeatHold() {
    build(true, now().plusHours(2));
    service.createStaffBooking(counter(PaymentMethod.CASH));

    Booking booking = saved.get();
    assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    assertThat(booking.getTickets()).allMatch(t -> t.getTicketStatus() == TicketStatus.BOOKED);
    assertThat(booking.getTickets()).allMatch(t -> t.getQrCode() != null);
    verifyNoInteractions(redisValues);
    verify(events).publishEvent(any(BookingPaidEvent.class));
  }

  @Test
  void bookingCodesAreUnambiguousBase32AndRetriedOnCollision() {
    build(false, now().plusDays(1));
    when(bookings.existsByBookingCode(anyString())).thenReturn(true, false);

    service.createBooking(online(null));

    assertThat(saved.get().getBookingCode()).matches("BK-\\d{8}-[0-9A-HJKMNP-TV-Z]{8}");
    verify(bookings, times(2)).existsByBookingCode(anyString());
  }

  @Test
  void cancellingAPendingBookingReturnsReservedPromotionUsage() {
    build(false, now().plusDays(1));
    Booking booking = pendingBooking(true);

    service.cancelBooking(booking.getId());

    assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
    verify(promotions).releaseUsage("SALE10");
    assertThat(booking.getPromotionUsageReserved()).isFalse();
    // Hủy lần nữa bị từ chối và không trả thêm lượt.
    assertError(() -> service.cancelBooking(booking.getId()), ErrorCode.BOOKING_CANNOT_CANCEL);
    verify(promotions, times(1)).releaseUsage("SALE10");
  }

  @Test
  void legacyPendingBookingWithoutReservationDoesNotReleaseUsage() {
    build(false, now().plusDays(1));
    Booking booking = pendingBooking(null);
    service.cancelBooking(booking.getId());
    verify(promotions, never()).releaseUsage(any());
  }

  @Test
  void switchingPromotionReleasesTheOldCodeAndReservesTheNewOne() {
    build(false, now().plusDays(1));
    Booking booking = pendingBooking(true);
    when(promotions.validatePromotion(eq("NEW20"), any(), any(), any()))
        .thenReturn(new BigDecimal("15000"));

    service.applyPromotion(booking.getId(), "NEW20");

    var order = inOrder(promotions);
    order.verify(promotions).releaseUsage("SALE10");
    order.verify(promotions).reserveUsage("NEW20");
    assertThat(booking.getPromotionCode()).isEqualTo("NEW20");
    assertThat(booking.getPromotionUsageReserved()).isTrue();
  }

  @Test
  void paymentCountsLegacyUsageOnceAndNeverRecountsReservedUsage() {
    build(false, now().plusDays(1));
    var users = mock(UserRepository.class);
    User customer = User.builder().id(1L).username("c").totalSpending(BigDecimal.ZERO).build();
    when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(customer));
    var membership = new BookingMembershipService(bookings, users, promotions);

    Booking reserved = pendingBooking(true);
    reserved.setId(7L);
    when(bookings.findById(7L)).thenReturn(Optional.of(reserved));
    membership.updateMembershipAfterPayment(7L);
    membership.updateMembershipAfterPayment(7L); // sự kiện lặp lại
    verify(promotions, never()).incrementUsage(any());
    assertThat(customer.getTotalSpending()).isEqualByComparingTo("75000");

    Booking legacy = pendingBooking(null);
    legacy.setId(8L);
    when(bookings.findById(8L)).thenReturn(Optional.of(legacy));
    membership.updateMembershipAfterPayment(8L);
    verify(promotions).incrementUsage("SALE10");
    assertThat(customer.getTotalSpending()).isEqualByComparingTo("150000");
  }

  @Test
  void foodQuantityIsCappedPerItem() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      assertThat(validator.validate(new CreateBookingFoodRequest(1L, 50))).isEmpty();
      assertThat(validator.validate(new CreateBookingFoodRequest(1L, 51))).isNotEmpty();
    }
  }

  // ===== fixture =====

  private void build(boolean atCounter, LocalDateTime startTime) {
    reset(bookings, promotions, events, redisValues);
    saved.set(null);
    User customer = User.builder().id(1L).username("customer").role(UserRole.USER).build();
    User operator =
        atCounter
            ? User.builder().id(2L).username("staff").role(UserRole.STAFF).branchId(1L).build()
            : customer;
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(operator.getUsername(), "unused", List.of()));
    var users = mock(UserRepository.class);
    when(users.findByUsername(operator.getUsername())).thenReturn(Optional.of(operator));
    when(users.findByUsername("customer")).thenReturn(Optional.of(customer));
    when(users.findByEmail("customer@example.test")).thenReturn(Optional.of(customer));
    Branch branch = Branch.builder().branchId(1L).status(BranchStatus.ACTIVE).build();
    Room room = Room.builder().id(1L).branch(branch).status(RoomStatus.ACTIVE).build();
    showtime =
        Showtime.builder()
            .id(1L)
            .room(room)
            .movie(Movie.builder().id(1L).isPublic(true).build())
            .status(ShowtimeStatus.OPEN)
            .startTime(startTime)
            .build();
    var showtimes = mock(ShowtimeRepository.class);
    when(showtimes.findById(1L)).thenReturn(Optional.of(showtime));
    var tickets = mock(TicketRepository.class);
    @SuppressWarnings("unchecked")
    org.mockito.stubbing.Answer<List<Ticket>> inventory =
        invocation ->
            ((List<Long>) invocation.getArgument(1))
                .stream()
                    .map(
                        id ->
                            Ticket.builder()
                                .id(id)
                                .seat(Seat.builder().id(id).seatCode("A" + id).build())
                                .showtime(showtime)
                                .price(new BigDecimal("75000"))
                                .ticketStatus(TicketStatus.AVAILABLE)
                                .build())
                    .toList();
    when(tickets.findSeatsForUpdate(eq(1L), anyList())).thenAnswer(inventory);
    when(bookings.save(any(Booking.class)))
        .thenAnswer(
            invocation -> {
              Booking booking = invocation.getArgument(0);
              if (booking.getId() == null) booking.setId(5L);
              saved.set(booking);
              return booking;
            });
    when(redisValues.setIfAbsent(anyString(), anyString(), anyLong(), any())).thenReturn(true);
    @SuppressWarnings("unchecked")
    RedisTemplate<String, String> redis = mock(RedisTemplate.class);
    when(redis.opsForValue()).thenReturn(redisValues);
    var mapper = mock(BookingMapper.class);
    service =
        BackendServiceFixtures.booking(
            bookings,
            showtimes,
            tickets,
            mock(FoodRepository.class),
            users,
            redis,
            mock(SimpMessagingTemplate.class),
            mapper,
            mock(PasswordEncoder.class),
            events,
            promotions,
            mock(AuditLogService.class),
            BackendServiceFixtures.settings(),
            mock(NotificationService.class),
            mock(FoodStockService.class),
            mock(BookingRefundService.class));
  }

  private Booking pendingBooking(Boolean promotionReserved) {
    Booking booking =
        Booking.builder()
            .id(9L)
            .bookingCode("BK-20261120-PENDING1")
            .user(User.builder().id(1L).username("customer").build())
            .showtime(showtime)
            .totalAmount(new BigDecimal("75000"))
            .discountAmount(BigDecimal.ZERO)
            .promotionCode("SALE10")
            .promotionUsageReserved(promotionReserved)
            .status(BookingStatus.PENDING)
            .expiresAt(now().plusMinutes(5))
            .build();
    booking.getPayment().setPaymentStatus(PaymentStatus.PENDING);
    booking.getPayment().setAmount(new BigDecimal("75000"));
    when(bookings.findByIdForUpdate(9L)).thenReturn(Optional.of(booking));
    return booking;
  }

  private static CreateBookingRequest online(String promotionCode) {
    CreateBookingRequest request = new CreateBookingRequest();
    request.setShowtimeId(1L);
    request.setSeatIds(List.of(1L));
    request.setPromotionCode(promotionCode);
    return request;
  }

  private static StaffBookingRequest counter(PaymentMethod method) {
    StaffBookingRequest request = new StaffBookingRequest();
    request.setShowtimeId(1L);
    request.setSeatIds(List.of(1L));
    request.setCustomerEmail("customer@example.test");
    request.setPaymentMethod(method);
    return request;
  }

  private static LocalDateTime now() {
    return LocalDateTime.now(BackendServiceFixtures.CLOCK);
  }

  private static void assertError(Runnable action, ErrorCode expected) {
    assertThatThrownBy(action::run)
        .isInstanceOfSatisfying(
            AppException.class, error -> assertThat(error.getErrorCode()).isEqualTo(expected));
  }

  @SuppressWarnings("unchecked")
  private static ValueOperations<String, String> mockValues() {
    return mock(ValueOperations.class);
  }
}
