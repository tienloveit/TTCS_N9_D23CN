package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.*;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.mapper.*;
import com.ltweb.backend.repository.*;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

// Run only against a disposable, migrated MySQL clone; never the live cinema database.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIfEnvironmentVariable(
    named = "PAYMENT_TEST_DATABASE",
    matches = "cinema_payment_test_\\d{14}")
@TestPropertySource(
    properties = {
      "spring.datasource.url=jdbc:mysql://127.0.0.1:3306/${PAYMENT_TEST_DATABASE}",
      "spring.datasource.username=${PAYMENT_TEST_USER}",
      "spring.datasource.password=${PAYMENT_TEST_PASSWORD}",
      "spring.jpa.hibernate.ddl-auto=validate"
    })
class PaymentPersistenceIntegrationTest {
  @Autowired EntityManager entityManager;
  @Autowired BookingRepository bookingRepository;
  @Autowired TicketRepository ticketRepository;
  @Autowired ShowtimeRepository showtimeRepository;
  @Autowired UserRepository userRepository;
  @Autowired FoodRepository foodRepository;

  @AfterEach
  void clearUser() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void showtimePricePersistsAndUpdatesAvailableTicketInventoryWithoutPriceTable() {
    assertThat(
            ((Number)
                    entityManager
                        .createNativeQuery(
                            "select count(*) from information_schema.tables where table_schema = database() and table_name = 'seat_type_prices'")
                        .getSingleResult())
                .intValue())
        .isZero();
    Ticket ticket = freshTicket();
    Long showtimeId = ticket.getShowtime().getId();
    Long ticketId = ticket.getId();
    var service =
        new ShowtimeService(
            BackendServiceFixtures.CLOCK,
            showtimeRepository,
            mock(RoomRepository.class),
            mock(MovieRepository.class),
            bookingRepository,
            ticketRepository,
            userRepository,
            Mappers.getMapper(ShowtimeMapper.class),
            mock(TicketService.class));
    var response =
        service.update(
            showtimeId,
            UpdateShowtimeRequest.builder().ticketPrice(new BigDecimal("123000")).build());
    assertThat(response.getTicketPrice()).isEqualByComparingTo("123000");
    entityManager.flush();
    entityManager.clear();
    assertThat(showtimeRepository.findById(showtimeId).orElseThrow().getTicketPrice())
        .isEqualByComparingTo("123000");
    assertThat(ticketRepository.findById(ticketId).orElseThrow().getPrice())
        .isEqualByComparingTo("123000");
  }

  @Test
  void onlineBookingCancelAndRebookKeepTicketInventoryAndPaymentsConsistent() {
    Ticket ticket = freshTicket();
    User customer = freshCustomer();
    authenticate(customer);
    BookingService service = bookingService();
    CreateBookingRequest request = new CreateBookingRequest();
    request.setShowtimeId(ticket.getShowtime().getId());
    request.setSeatIds(List.of(ticket.getSeat().getId()));
    var created = service.createBooking(request);
    entityManager.flush();
    assertThat(created.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    assertThat(created.getTickets()).hasSize(1);
    Long ticketId = ticket.getId();
    service.cancelBooking(created.getBookingId());
    entityManager.flush();
    entityManager.clear();
    Ticket released = entityManager.find(Ticket.class, ticketId);
    assertThat(released).isNotNull();
    assertThat(released.getTicketStatus()).isEqualTo(TicketStatus.AVAILABLE);
    assertThat(released.getBooking()).isNull();
    assertThat(
            entityManager
                .find(Booking.class, created.getBookingId())
                .getPayment()
                .getPaymentStatus())
        .isEqualTo(PaymentStatus.CANCELLED);
    var rebooked = service.createBooking(request);
    entityManager.flush();
    assertThat(rebooked.getBookingId()).isNotEqualTo(created.getBookingId());
    assertThat(rebooked.getTickets()).hasSize(1);
  }

  @Test
  void staffVnpayBookingRemainsPendingUntilCallback() {
    Ticket ticket = freshTicket();
    User customer = freshCustomer();
    User admin =
        entityManager
            .createQuery("select u from User u where u.role = :role", User.class)
            .setParameter("role", UserRole.ADMIN)
            .setMaxResults(1)
            .getSingleResult();
    authenticate(admin);
    StaffBookingRequest request = new StaffBookingRequest();
    request.setShowtimeId(ticket.getShowtime().getId());
    request.setSeatIds(List.of(ticket.getSeat().getId()));
    request.setCustomerEmail(customer.getEmail());
    request.setPaymentMethod(PaymentMethod.VNPAY);
    var result = bookingService().createStaffBooking(request);
    entityManager.flush();
    entityManager.clear();
    Booking saved = bookingRepository.findById(result.getBookingId()).orElseThrow();
    assertThat(saved.getStatus()).isEqualTo(BookingStatus.PENDING);
    assertThat(saved.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    assertThat(saved.getPayment().getPaidAt()).isNull();
    assertThat(saved.getStaffUser().getId()).isEqualTo(admin.getId());
    assertThat(saved.getTickets()).hasSize(1);
    assertThat(saved.getTickets().getFirst().getTicketStatus()).isEqualTo(TicketStatus.HOLDING);
  }

  @Test
  void staffCashSaleCheckInAndRefundRulesUsePaymentTable() {
    Ticket ticket = freshTicket();
    User customer = freshCustomer();
    User admin =
        entityManager
            .createQuery("select u from User u where u.role = :role", User.class)
            .setParameter("role", UserRole.ADMIN)
            .setMaxResults(1)
            .getSingleResult();
    authenticate(admin);
    StaffBookingRequest request = new StaffBookingRequest();
    request.setShowtimeId(ticket.getShowtime().getId());
    request.setSeatIds(List.of(ticket.getSeat().getId()));
    request.setCustomerEmail(customer.getEmail());
    request.setPaymentMethod(PaymentMethod.CASH);
    BookingService service = bookingService();
    var sale = service.createStaffBooking(request);
    entityManager.flush();
    assertThat(sale.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    TicketService checkIn =
        BackendServiceFixtures.ticket(
            ticketRepository,
            bookingRepository,
            showtimeRepository,
            mock(com.ltweb.backend.repository.SeatRepository.class),
            userRepository,
            mock(org.springframework.data.redis.core.StringRedisTemplate.class),
            Mappers.getMapper(TicketMapper.class),
            mock(QRCodeReaderService.class),
            mock(AuditLogService.class));
    CheckInTicketRequest scan = new CheckInTicketRequest();
    scan.setCode(ticket.getQrCode());
    checkIn.checkIn(scan);
    entityManager.flush();
    assertThat(ticket.getCheckedInBy().getId()).isEqualTo(admin.getId());
    authenticate(customer);
    assertThatThrownBy(() -> service.requestRefund(sale.getBookingId(), "After entry"))
        .isInstanceOf(AppException.class);
  }

  @Test
  void staffCannotSellClosedShowtimeOrHiddenMovie() {
    Ticket ticket = freshTicket();
    User admin =
        entityManager
            .createQuery("select u from User u where u.role = :role", User.class)
            .setParameter("role", UserRole.ADMIN)
            .setMaxResults(1)
            .getSingleResult();
    authenticate(admin);
    StaffBookingRequest request = new StaffBookingRequest();
    request.setShowtimeId(ticket.getShowtime().getId());
    request.setSeatIds(List.of(ticket.getSeat().getId()));
    BookingService service = bookingService();
    ticket.getShowtime().setStatus(ShowtimeStatus.CLOSED);
    assertThatThrownBy(() -> service.createStaffBooking(request)).isInstanceOf(AppException.class);
    ticket.getShowtime().setStatus(ShowtimeStatus.OPEN);
    ticket.getShowtime().getMovie().setIsPublic(false);
    assertThatThrownBy(() -> service.createStaffBooking(request)).isInstanceOf(AppException.class);
  }

  private void authenticate(User user) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(
                user.getUsername(), "n/a", java.util.List.of()));
  }

  private User freshCustomer() {
    String suffix = UUID.randomUUID().toString();
    User user =
        User.builder()
            .username("audit-" + suffix)
            .email(suffix + "@example.test")
            .role(UserRole.USER)
            .status(UserStatus.ACTIVE)
            .build();
    entityManager.persist(user);
    return user;
  }

  private Ticket freshTicket() {
    Room room =
        entityManager
            .createQuery("select r from Room r", Room.class)
            .setMaxResults(1)
            .getSingleResult();
    room.setStatus(RoomStatus.ACTIVE);
    room.getBranch().setStatus(BranchStatus.ACTIVE);
    Movie movie =
        entityManager
            .createQuery("select m from Movie m", Movie.class)
            .setMaxResults(1)
            .getSingleResult();
    movie.setIsPublic(true);
    Showtime showtime =
        Showtime.builder()
            .room(room)
            .movie(movie)
            .status(ShowtimeStatus.OPEN)
            .startTime(LocalDateTime.now().plusDays(3))
            .endTime(LocalDateTime.now().plusDays(3).plusHours(2))
            .build();
    entityManager.persist(showtime);
    Seat seat =
        entityManager
            .createQuery("select s from Seat s where s.room.id = :roomId", Seat.class)
            .setParameter("roomId", room.getId())
            .setMaxResults(1)
            .getSingleResult();
    Ticket ticket =
        Ticket.builder()
            .seat(seat)
            .showtime(showtime)
            .ticketStatus(TicketStatus.AVAILABLE)
            .price(new BigDecimal("100000"))
            .build();
    entityManager.persist(ticket);
    entityManager.flush();
    return ticket;
  }

  @SuppressWarnings("unchecked")
  private BookingService bookingService() {
    BookingMapper mapper = Mappers.getMapper(BookingMapper.class);
    ReflectionTestUtils.setField(mapper, "ticketMapper", Mappers.getMapper(TicketMapper.class));
    SystemSettingService settings = mock(SystemSettingService.class);
    when(settings.getInt(anyString(), anyInt()))
        .thenAnswer(invocation -> invocation.getArgument(1));
    RedisTemplate<String, String> redis = mock(RedisTemplate.class);
    ValueOperations<String, String> values = mock(ValueOperations.class);
    when(redis.opsForValue()).thenReturn(values);
    when(values.setIfAbsent(anyString(), anyString(), anyLong(), any())).thenReturn(true);
    return BackendServiceFixtures.booking(
        bookingRepository,
        showtimeRepository,
        ticketRepository,
        foodRepository,
        userRepository,
        redis,
        mock(SimpMessagingTemplate.class),
        mapper,
        mock(org.springframework.security.crypto.password.PasswordEncoder.class),
        mock(ApplicationEventPublisher.class),
        mock(PromotionService.class),
        mock(AuditLogService.class),
        settings,
        mock(NotificationService.class),
        mock(FoodStockService.class),
        mock(BookingRefundService.class));
  }

  @Test
  void insertUpdateAndDeleteBookingCascadeToSeparatePayment() {
    Showtime showtime =
        entityManager
            .createQuery("select s from Showtime s", Showtime.class)
            .setMaxResults(1)
            .getSingleResult();
    User processor =
        entityManager
            .createQuery("select u from User u", User.class)
            .setMaxResults(1)
            .getSingleResult();
    Booking booking =
        Booking.builder()
            .bookingCode("PAYMENT-TEST-" + UUID.randomUUID())
            .showtime(showtime)
            .totalAmount(new BigDecimal("120000"))
            .status(BookingStatus.PENDING)
            .build();
    booking.getPayment().setPaymentMethod(PaymentMethod.CASH);
    booking.getPayment().setPaymentCreatedAt(LocalDateTime.now());

    entityManager.persist(booking);
    entityManager.flush();
    Long bookingId = booking.getId();
    entityManager.clear();

    booking = entityManager.find(Booking.class, bookingId);
    var payment = booking.getPayment();
    assertThat(payment.getId()).isNotNull();
    assertThat(payment.getBooking().getId()).isEqualTo(bookingId);
    assertThat(payment.getAmount()).isEqualByComparingTo("120000");
    assertThat(payment.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
    assertThat(payment.getCreatedAt()).isNotNull();
    assertThat(payment.getUpdatedAt()).isNotNull();

    booking.setStatus(BookingStatus.REFUNDED);
    payment.setPaymentStatus(PaymentStatus.REFUNDED);
    payment.setPaidAt(LocalDateTime.now().minusMinutes(10));
    payment.setRefundAmount(new BigDecimal("120000"));
    payment.setRefundProcessedBy(processor);
    payment.setRefundProcessNote("Integration refund");
    entityManager.flush();
    entityManager.clear();

    booking = entityManager.find(Booking.class, bookingId);
    assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
    assertThat(booking.getPayment().getRefundAmount()).isEqualByComparingTo("120000");
    assertThat(booking.getPayment().getRefundProcessedBy().getId()).isEqualTo(processor.getId());
    assertThat(booking.getPayment().getRefundProcessNote()).isEqualTo("Integration refund");

    entityManager.remove(booking);
    entityManager.flush();
    assertThat(
            ((Number)
                    entityManager
                        .createNativeQuery("SELECT COUNT(*) FROM payments WHERE booking_id = :id")
                        .setParameter("id", bookingId)
                        .getSingleResult())
                .intValue())
        .isZero();
  }
}
