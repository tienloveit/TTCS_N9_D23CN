package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.Payment;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.http.MediaType;
import org.springframework.orm.jpa.support.OpenEntityManagerInViewInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Gọi mọi API đọc dữ liệu với từng vai trò trên ứng dụng đầy đủ (H2, Open Session in View tắt như
 * cấu hình chạy thật). Mục tiêu là bắt lỗi chỉ lộ ra lúc chạy, như LazyInitializationException khi
 * mapper đọc quan hệ lazy ngoài transaction. Không kiểm tra nội dung phản hồi; mã 4xx do phân quyền
 * là hợp lệ, chỉ 5xx bị coi là lỗi.
 */
@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:read_smoke;MODE=MySQL;DB_CLOSE_DELAY=-1",
      "spring.datasource.driver-class-name=org.h2.Driver",
      "spring.datasource.username=sa",
      "spring.datasource.password=",
      "spring.datasource.hikari.connection-init-sql=SELECT 1",
      "spring.flyway.enabled=false",
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
      "spring.jpa.show-sql=false",
      "spring.mail.username=test@example.com",
      "spring.mail.password=unused",
      "jwt.secret-key=smoke-test-secret-key-smoke-test-secret-key-smoke-test-secret-key-0123",
      "vnpay.tmn-code=TEST",
      "vnpay.secret-key=smoke-test-secret"
    })
@AutoConfigureMockMvc
class ReadEndpointsSmokeTest {
  private static final List<String> ROLES = List.of("ADMIN", "MANAGER", "STAFF", "USER");

  @Autowired MockMvc mvc;
  @Autowired ApplicationContext context;
  @Autowired DataSeedService seeder;
  @Autowired TransactionTemplate tx;
  @Autowired Clock clock;
  @Autowired UserRepository users;
  @Autowired ShowtimeRepository showtimes;
  @Autowired TicketRepository tickets;
  @Autowired BookingRepository bookings;
  @Autowired FoodRepository foods;

  @MockitoBean StringRedisTemplate redis;

  // Bean riêng của RedisConfig dùng để giữ/nhả ghế (cùng kiểu cha với StringRedisTemplate nên chọn
  // theo tên). Dùng spy vì repository Redis cũ cần connection factory thật lúc khởi động.
  @MockitoSpyBean(name = "redisTemplate")
  RedisTemplate<String, String> seatHolds;

  // Một ApplicationContext (và một database H2) cho cả lớp: chỉ nạp dữ liệu một lần.
  private static Ids ids;

  @BeforeEach
  void seed() {
    @SuppressWarnings("unchecked")
    ValueOperations<String, String> values = mock(ValueOperations.class);
    when(redis.opsForValue()).thenReturn(values);
    when(values.multiGet(anyCollection()))
        .thenAnswer(call -> Arrays.asList(new String[call.<Collection<?>>getArgument(0).size()]));
    // Script Lua nhả khóa ghế: coi như đã nhả, không cần Redis thật.
    doReturn(1L).when(seatHolds).execute(any(RedisScript.class), anyList(), any());
    if (ids == null) {
      ids = tx.execute(status -> seedData());
    }
  }

  @Test
  void everyReadEndpointAnswersWithoutServerErrorsForEveryRole() throws Exception {
    List<String> failures = new ArrayList<>();
    for (String path : paths()) {
      for (String role : ROLES) {
        MvcResult result = mvc.perform(get(path).with(as(role))).andReturn();
        if (result.getResponse().getStatus() >= 500) {
          failures.add(describe(role, "GET " + path, result));
        }
      }
      MvcResult anonymous = mvc.perform(get(path)).andReturn();
      if (anonymous.getResponse().getStatus() >= 500) {
        failures.add(describe("anonymous", "GET " + path, anonymous));
      }
    }
    assertThat(failures).isEmpty();
  }

  @Test
  void openSessionInViewIsOffSoLazyLoadingOutsideServicesWouldFail() {
    assertThat(context.getBeanNamesForType(OpenEntityManagerInViewInterceptor.class)).isEmpty();
  }

  @Test
  void authenticatedRolesReachTheirOwnScreens() throws Exception {
    // Đảm bảo bài kiểm tra trên thật sự đi vào service, không dừng ở 401/403.
    assertOk("ADMIN", "/booking/search?q=BK&status=COMPLETED&from=2026-01-01&page=0&size=5");
    assertOk("ADMIN", "/admin/analytics/dashboard");
    assertOk("MANAGER", "/admin/reports/revenue");
    assertOk("STAFF", "/staff/dashboard");
    assertOk("STAFF", "/booking/" + ids.bookingId());
    assertOk("USER", "/booking/my-bookings/list");
  }

  @Test
  void updatingACheckedInTicketMapsItsCheckerInsideTheTransaction() throws Exception {
    // Vé đầu tiên đã được soát: phản hồi đọc checkedInBy (lazy) nên phải map trong transaction.
    MvcResult result =
        mvc.perform(
                put("/ticket/" + ids.ticketId())
                    .with(as("ADMIN"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"qrCode\":\"BK-SMOKE-UPDATED\"}"))
            .andReturn();
    assertThat(result.getResponse().getStatus())
        .as(describe("ADMIN", "PUT /ticket/" + ids.ticketId(), result))
        .isEqualTo(200);
  }

  @Test
  void staffCheckInLoadsTicketsSeatsAndShowtimeInsideTheTransaction() throws Exception {
    assertWriteOk(
        "STAFF",
        post("/ticket/check-in")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"code\":\"BK-SMOKE-ONLINE\"}"),
        "POST /ticket/check-in");
  }

  @Test
  void approvingACashRefundReleasesSeatsAndReturnsTheRefundedBooking() throws Exception {
    MvcResult result =
        assertWriteOk(
            "ADMIN",
            post("/booking/" + ids.counterBookingId() + "/refund-process")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"approved\":true,\"note\":\"Hoan tai quay\"}"),
            "POST /booking/{id}/refund-process");
    assertThat(result.getResponse().getContentAsString()).contains("\"REFUNDED\"");
  }

  private MvcResult assertWriteOk(
      String role,
      org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
      String label)
      throws Exception {
    MvcResult result = mvc.perform(request.with(as(role))).andReturn();
    assertThat(result.getResponse().getStatus())
        .as(describe(role, label, result) + " " + result.getResponse().getContentAsString())
        .isEqualTo(200);
    return result;
  }

  private void assertOk(String role, String path) throws Exception {
    MvcResult result = mvc.perform(get(path).with(as(role))).andReturn();
    assertThat(result.getResponse().getStatus())
        .as(describe(role, "GET " + path, result))
        .isEqualTo(200);
  }

  private List<String> paths() {
    LocalDate today = LocalDate.now(clock);
    return List.of(
        "/admin/analytics/dashboard",
        "/admin/audit-logs",
        "/admin/operations/daily-report",
        "/admin/reports/revenue",
        "/admin/reports/export/revenue.xlsx",
        "/admin/reports/export/operations.xlsx",
        "/admin/settings",
        "/booking/search",
        "/booking/search?q=BK&paymentStatus=PAID&showtimeDate=" + today + "&checkedInDate=" + today,
        "/booking/refunds",
        "/booking/" + ids.bookingId(),
        "/booking/my-bookings/list",
        "/booking/my-bookings/" + ids.bookingId(),
        "/branch",
        "/branch/" + ids.branchId(),
        "/director",
        "/director/" + ids.directorId(),
        "/food",
        "/food/all",
        "/food/" + ids.foodId(),
        "/genre",
        "/genre/" + ids.genreId(),
        "/movie",
        "/movie/upcoming",
        "/movie/now-showing",
        "/movie/" + ids.movieId(),
        "/movie/" + ids.movieId() + "/rating/my",
        "/movie/" + ids.movieId() + "/ratings",
        "/notifications",
        "/notifications/unread-count",
        "/promotion",
        "/promotion/available",
        "/room",
        "/room/" + ids.roomId(),
        "/seat/" + ids.seatId(),
        "/seat/room/" + ids.roomId(),
        "/showtime",
        "/showtime/today",
        "/showtime/" + ids.showtimeId(),
        "/showtime/room/" + ids.roomId(),
        "/showtime/movie/" + ids.movieId(),
        "/showtime/branch/" + ids.branchId(),
        "/staff/dashboard",
        "/staff/customers/lookup?phone=0902000001",
        "/ticket",
        "/ticket/showtime/" + ids.showtimeId(),
        "/ticket/" + ids.ticketId(),
        "/users",
        "/users/" + ids.userId(),
        "/my-info");
  }

  private Ids seedData() {
    seeder.seedInitialData();
    Showtime showtime =
        showtimes.findAll().stream()
            .filter(s -> s.getStartTime().isAfter(LocalDateTime.now(clock)))
            .findFirst()
            .orElseThrow();
    // Đưa suất vào khung soát vé (mở 60 phút trước giờ chiếu).
    LocalDateTime start = LocalDateTime.now(clock).plusMinutes(30);
    showtime.setStartTime(start);
    showtime.setEndTime(start.plusHours(2));
    Long branchId = showtime.getRoom().getBranch().getBranchId();
    for (String name : List.of("manager", "staff")) {
      User operator = users.findByUsername(name).orElseThrow();
      operator.setBranchId(branchId);
    }
    User customer = users.findByUsername("user").orElseThrow();
    User staff = users.findByUsername("staff").orElseThrow();
    Food food = foods.findAll().getFirst();

    List<Ticket> free = tickets.findByShowtimeIdForUpdate(showtime.getId());
    Booking online = paidBooking("BK-SMOKE-ONLINE", showtime, customer, null, free.subList(0, 2));
    online.getBookingFoods().add(food(online, food));
    online.getTickets().getFirst().setCheckedInAt(LocalDateTime.now(clock));
    online.getTickets().getFirst().setCheckedInBy(staff);
    Booking counter = paidBooking("BK-SMOKE-COUNTER", showtime, null, staff, free.subList(2, 3));
    counter.setStatus(BookingStatus.REFUND_REQUESTED);
    counter.getPayment().setRefundReason("Khach doi y");
    bookings.save(online);
    bookings.save(counter);

    return new Ids(
        online.getId(),
        counter.getId(),
        branchId,
        showtime.getMovie().getDirector() == null ? 1L : showtime.getMovie().getDirector().getId(),
        food.getId(),
        showtime.getMovie().getGenres().stream().findFirst().map(g -> g.getId()).orElse(1L),
        showtime.getMovie().getId(),
        showtime.getRoom().getId(),
        free.getFirst().getSeat().getId(),
        showtime.getId(),
        free.getFirst().getId(),
        customer.getId());
  }

  private Booking paidBooking(
      String code, Showtime showtime, User customer, User staff, List<Ticket> seats) {
    BigDecimal total =
        seats.stream().map(Ticket::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
    Booking booking =
        Booking.builder()
            .bookingCode(code)
            .user(customer)
            .staffUser(staff)
            .showtime(showtime)
            .status(BookingStatus.COMPLETED)
            .totalAmount(total)
            .build();
    Payment payment = new Payment();
    payment.setPaymentStatus(PaymentStatus.PAID);
    payment.setPaymentMethod(staff == null ? PaymentMethod.VNPAY : PaymentMethod.CASH);
    payment.setPaidAt(LocalDateTime.now(clock).minusHours(1));
    booking.setPayment(payment);
    for (Ticket ticket : seats) {
      ticket.setBooking(booking);
      ticket.setTicketStatus(TicketStatus.BOOKED);
      ticket.setQrCode(code + "-" + ticket.getId());
      booking.getTickets().add(ticket);
    }
    return booking;
  }

  private static BookingFood food(Booking booking, Food food) {
    return BookingFood.builder()
        .booking(booking)
        .food(food)
        .quantity(2)
        .unitPrice(food.getPrice())
        .subtotal(food.getPrice().multiply(BigDecimal.TWO))
        .build();
  }

  /** Đăng nhập sẵn cho request qua repository mặc định của Spring Security (không cần JWT). */
  private static RequestPostProcessor as(String role) {
    return request -> {
      var context = SecurityContextHolder.createEmptyContext();
      context.setAuthentication(
          UsernamePasswordAuthenticationToken.authenticated(
              username(role), null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
      request.setAttribute(
          RequestAttributeSecurityContextRepository.DEFAULT_REQUEST_ATTR_NAME, context);
      return request;
    };
  }

  private static String username(String role) {
    return role.equals("USER") ? "user" : role.toLowerCase();
  }

  private static String describe(String role, String request, MvcResult result) {
    Exception error = result.getResolvedException();
    Throwable root = error;
    while (root != null && root.getCause() != null) {
      root = root.getCause();
    }
    return role
        + " "
        + request
        + " -> "
        + result.getResponse().getStatus()
        + (root == null ? "" : " " + root.getClass().getSimpleName() + ": " + root.getMessage());
  }

  private record Ids(
      Long bookingId,
      Long counterBookingId,
      Long branchId,
      Long directorId,
      Long foodId,
      Long genreId,
      Long movieId,
      Long roomId,
      Long seatId,
      Long showtimeId,
      Long ticketId,
      Long userId) {}
}
