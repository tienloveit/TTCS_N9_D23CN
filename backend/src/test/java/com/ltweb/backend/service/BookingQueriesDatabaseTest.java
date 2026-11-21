package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.Payment;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.ShowtimeStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.BookingSearchFilter;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

/**
 * Chạy truy vấn báo cáo/dashboard và tìm đơn trên H2 (chế độ MySQL, schema tạo từ entity) để kiểm
 * tra kết quả dữ liệu, không chỉ cú pháp. Không thay thế kiểm thử trên bản sao MySQL thật.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:booking_queries;MODE=MySQL;DB_CLOSE_DELAY=-1",
      "spring.datasource.driver-class-name=org.h2.Driver",
      "spring.datasource.username=sa",
      "spring.datasource.password=",
      "spring.datasource.hikari.connection-init-sql=SELECT 1",
      "spring.flyway.enabled=false",
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
      "spring.jpa.show-sql=false"
    })
class BookingQueriesDatabaseTest {
  private static final LocalDate DAY = LocalDate.of(2026, 11, 20);
  private static final LocalDateTime START = DAY.atStartOfDay();
  private static final LocalDateTime END = DAY.plusDays(1).atStartOfDay();

  @Autowired EntityManager em;
  @Autowired BookingRepository bookings;
  @Autowired ShowtimeRepository showtimes;
  @Autowired TicketRepository tickets;

  private Branch north;
  private Branch south;
  private User staff;
  private User otherStaff;
  private User customer;
  private Showtime northToday;
  private Showtime northTomorrow;
  private Showtime southToday;
  private Food popcorn;
  private int seatCounter;

  @BeforeEach
  void seed() {
    north = persist(Branch.builder().branchCode("N").name("PTIT Ha Dong").build());
    south = persist(Branch.builder().branchCode("S").name("PTIT Thu Duc").build());
    staff = persist(user("staff", UserRole.STAFF, north.getBranchId()));
    otherStaff = persist(user("staff2", UserRole.STAFF, north.getBranchId()));
    customer = persist(user("an.nguyen", UserRole.USER, null));
    Movie dune = persist(Movie.builder().movieName("Dune 50%").build());
    Movie conan = persist(Movie.builder().movieName("Conan").build());
    Room northRoom = persist(room(north, "N1"));
    Room southRoom = persist(room(south, "S1"));
    northToday = persist(showtime(northRoom, dune, START.plusHours(19)));
    northTomorrow = persist(showtime(northRoom, conan, START.plusDays(1).plusHours(10)));
    southToday = persist(showtime(southRoom, conan, START.plusHours(20)));
    popcorn = persist(Food.builder().name("Bap").price(new BigDecimal("40000")).build());
  }

  // ===== Truy vấn báo cáo (đợt lọc bằng SQL thay cho findAll) =====

  @Test
  void paidByPaymentDateFallsBackToUpdatedAtAndRespectsEveryOptionalFilter() {
    Booking paidToday = booking("BK-1", northToday, BookingStatus.COMPLETED, PaymentStatus.PAID);
    paidToday.getPayment().setPaidAt(START.plusHours(9));
    paidToday.getPayment().setPaymentMethod(PaymentMethod.CASH);
    paidToday.setStaffUser(staff);
    // Không có paidAt: ngày thanh toán lấy updatedAt (đặt sau khi lưu).
    Booking noPaidAt = booking("BK-2", southToday, BookingStatus.COMPLETED, PaymentStatus.PENDING);
    Booking pending = booking("BK-3", northToday, BookingStatus.PENDING, PaymentStatus.PENDING);
    Booking paidYesterday =
        booking("BK-4", northToday, BookingStatus.COMPLETED, PaymentStatus.PAID);
    paidYesterday.getPayment().setPaidAt(START.minusHours(1));
    save(paidToday, noPaidAt, pending, paidYesterday);
    setTimestamps(noPaidAt, START.minusDays(3), START.plusHours(8));

    LocalDateTime now = START.plusHours(12);
    assertThat(codes(bookings.findPaidByPaymentDate(START, END, now, null, null, null, null)))
        .containsExactly("BK-1", "BK-2");
    assertThat(
            codes(
                bookings.findPaidByPaymentDate(
                    START, END, now, north.getBranchId(), null, null, null)))
        .containsExactly("BK-1");
    assertThat(
            codes(
                bookings.findPaidByPaymentDate(
                    START, END, now, null, null, staff.getId(), PaymentMethod.CASH)))
        .containsExactly("BK-1");
    assertThat(
            bookings.findPaidByPaymentDate(START, END, now, null, null, otherStaff.getId(), null))
        .isEmpty();
    assertThat(
            codes(
                bookings.findPaidByPaymentDate(
                    START, END, now, null, southToday.getMovie().getId(), null, null)))
        .containsExactly("BK-2");
  }

  @Test
  void dashboardCountsAndSumsStayInsideTheRequestedDayAndBranch() {
    Booking paid = booking("BK-1", northToday, BookingStatus.COMPLETED, PaymentStatus.PAID, 2);
    paid.getTickets().getFirst().setCheckedInAt(START.plusHours(18));
    Booking refunded = booking("BK-2", northToday, BookingStatus.REFUNDED, PaymentStatus.REFUNDED);
    refunded.getPayment().setRefundedAt(START.plusHours(10));
    refunded.getPayment().setRefundAmount(new BigDecimal("90000"));
    Booking refundedSouth =
        booking("BK-3", southToday, BookingStatus.REFUNDED, PaymentStatus.REFUNDED);
    refundedSouth.getPayment().setRefundedAt(START.plusHours(11));
    refundedSouth.getPayment().setRefundAmount(new BigDecimal("50000"));
    Booking pending = booking("BK-4", northTomorrow, BookingStatus.PENDING, PaymentStatus.PENDING);
    Booking requested =
        booking("BK-5", northToday, BookingStatus.REFUND_REQUESTED, PaymentStatus.PAID);
    save(paid, refunded, refundedSouth, pending, requested);
    setTimestamps(pending, START.plusHours(7), START.plusHours(7));

    Long northId = north.getBranchId();
    assertThat(bookings.sumRefundedAmount(START, END, northId)).isEqualByComparingTo("90000");
    assertThat(bookings.sumRefundedAmount(START, END, null)).isEqualByComparingTo("140000");
    assertThat(bookings.countByStatusCreatedBetween(BookingStatus.PENDING, START, END, northId))
        .isEqualTo(1);
    assertThat(bookings.countByStatusInBranch(BookingStatus.REFUND_REQUESTED, northId))
        .isEqualTo(1);
    assertThat(bookings.countByStatusInBranch(BookingStatus.REFUND_REQUESTED, south.getBranchId()))
        .isZero();
    assertThat(tickets.countCheckedInBetween(northId, START, END)).isEqualTo(1);
    assertThat(tickets.countCheckedInBetween(south.getBranchId(), START, END)).isZero();
    // Vé chỉ thuộc đơn đã thanh toán và suất bắt đầu trong ngày.
    assertThat(codes(bookings.findPaidByShowtimeStart(START, END, northId)))
        .containsExactly("BK-1", "BK-5");

    Map<Long, Long> perShowtime =
        tickets.countGroupedByShowtimeIds(List.of(northToday.getId(), southToday.getId())).stream()
            .collect(Collectors.toMap(row -> (Long) row[0], row -> ((Number) row[1]).longValue()));
    // BK-1 (2 vé), BK-2 và BK-5 (1 vé mỗi đơn); BK-4 thuộc suất ngày mai.
    assertThat(perShowtime).containsEntry(northToday.getId(), 4L);
    assertThat(perShowtime).containsEntry(southToday.getId(), 1L);
  }

  @Test
  void staffQueriesOnlyReturnThatSellersBookingsForTheDay() {
    Booking cashToday = booking("BK-1", northToday, BookingStatus.COMPLETED, PaymentStatus.PAID);
    cashToday.setStaffUser(staff);
    cashToday.getPayment().setPaymentMethod(PaymentMethod.CASH);
    cashToday.getPayment().setPaidAt(START.plusHours(9));
    Booking refundedFromYesterday =
        booking("BK-2", northToday, BookingStatus.REFUNDED, PaymentStatus.REFUNDED);
    refundedFromYesterday.setStaffUser(staff);
    refundedFromYesterday.getPayment().setPaymentMethod(PaymentMethod.CASH);
    refundedFromYesterday.getPayment().setPaidAt(START.minusHours(5));
    refundedFromYesterday.getPayment().setRefundedAt(START.plusHours(10));
    Booking vnpayToday = booking("BK-3", northToday, BookingStatus.COMPLETED, PaymentStatus.PAID);
    vnpayToday.setStaffUser(staff);
    vnpayToday.getPayment().setPaymentMethod(PaymentMethod.VNPAY);
    vnpayToday.getPayment().setPaidAt(START.plusHours(11));
    Booking otherSeller = booking("BK-4", northToday, BookingStatus.COMPLETED, PaymentStatus.PAID);
    otherSeller.setStaffUser(otherStaff);
    otherSeller.getPayment().setPaymentMethod(PaymentMethod.CASH);
    otherSeller.getPayment().setPaidAt(START.plusHours(9));
    save(cashToday, refundedFromYesterday, vnpayToday, otherSeller);

    Long northId = north.getBranchId();
    assertThat(codes(bookings.findStaffBookingsByBusinessDate(staff.getId(), northId, START, END)))
        .containsExactly("BK-1", "BK-3");
    assertThat(codes(bookings.findStaffCashMovements(staff.getId(), northId, START, END)))
        .containsExactly("BK-1", "BK-2");
    assertThat(bookings.findStaffCashMovements(staff.getId(), south.getBranchId(), START, END))
        .isEmpty();
  }

  @Test
  void recentBookingsAreNewestFirstWithDetails() {
    Booking older = booking("BK-1", northToday, BookingStatus.COMPLETED, PaymentStatus.PAID);
    Booking newer = booking("BK-2", northToday, BookingStatus.PENDING, PaymentStatus.PENDING);
    Booking otherBranch = booking("BK-3", southToday, BookingStatus.PENDING, PaymentStatus.PENDING);
    newer.setStaffUser(staff);
    save(older, newer, otherBranch);
    setTimestamps(older, START.plusHours(1), START.plusHours(1));
    setTimestamps(newer, START.plusHours(2), START.plusHours(2));
    setTimestamps(otherBranch, START.plusHours(3), START.plusHours(3));

    List<Booking> recent = bookings.findRecent(north.getBranchId(), null, 5);
    assertThat(codes(recent)).containsExactly("BK-2", "BK-1");
    assertThat(recent.getFirst().getTickets()).hasSize(1);
    assertThat(codes(bookings.findRecent(null, staff.getId(), 5))).containsExactly("BK-2");
    assertThat(codes(bookings.findRecent(null, null, 2))).containsExactly("BK-3", "BK-2");
  }

  @Test
  void showtimeQueriesScopeByBranchAndTime() {
    assertThat(showtimes.findStartingBetween(START, END, north.getBranchId()))
        .extracting(Showtime::getId)
        .containsExactly(northToday.getId());
    assertThat(
            showtimes.findUpcoming(north.getBranchId(), START.plusHours(12), PageRequest.of(0, 5)))
        .extracting(Showtime::getId)
        .containsExactly(northToday.getId(), northTomorrow.getId());
    assertThat(showtimes.findMovieIdsByBranchId(south.getBranchId()))
        .containsExactly(southToday.getMovie().getId());
    assertThat(
            showtimes.findByStatusAndEndTimeBefore(
                ShowtimeStatus.OPEN, START.plusHours(21).plusMinutes(30)))
        .extracting(Showtime::getId)
        .containsExactly(northToday.getId());
  }

  // ===== Danh sách đơn quản lý (phân trang ở DB) =====

  @Test
  void searchPagesNewestFirstAndTotalsCoverTheWholeFilter() {
    for (int i = 1; i <= 5; i++) {
      Booking booking =
          booking(
              "BK-" + i,
              northToday,
              i % 2 == 0 ? BookingStatus.COMPLETED : BookingStatus.REFUND_REQUESTED,
              PaymentStatus.PAID);
      booking.setTotalAmount(new BigDecimal(i * 10_000));
      save(booking);
      setTimestamps(booking, START.plusMinutes(i), START.plusMinutes(i));
    }
    Booking south1 = booking("BK-S", southToday, BookingStatus.COMPLETED, PaymentStatus.PAID);
    save(south1);

    var filter = BookingSearchFilter.forBranch(north.getBranchId());
    var first = bookings.searchIds(filter, PageRequest.of(0, 2));
    var last = bookings.searchIds(filter, PageRequest.of(2, 2));
    assertThat(first.getTotalElements()).isEqualTo(5);
    assertThat(first.getTotalPages()).isEqualTo(3);
    assertThat(codesOf(first.getContent())).containsExactly("BK-5", "BK-4");
    assertThat(codesOf(last.getContent())).containsExactly("BK-1");

    var totals = bookings.totals(filter);
    assertThat(totals.completed()).isEqualTo(2);
    assertThat(totals.refundRequested()).isEqualTo(3);
    assertThat(totals.paidAmount()).isEqualByComparingTo("150000");
  }

  @Test
  void searchTextMatchesCodeCustomerMovieBranchSeatAndTicketIdWithLiteralWildcards() {
    Booking online = booking("BK-ONLINE", northToday, BookingStatus.COMPLETED, PaymentStatus.PAID);
    online.setUser(customer);
    Booking counter =
        booking("BK-COUNTER", southToday, BookingStatus.COMPLETED, PaymentStatus.PAID);
    save(online, counter);
    Ticket counterTicket = counter.getTickets().getFirst();

    assertThat(search("bk-online")).containsExactly("BK-ONLINE");
    assertThat(search("AN.NGUYEN")).containsExactly("BK-ONLINE");
    assertThat(search("thu duc")).containsExactly("BK-COUNTER");
    assertThat(search(counterTicket.getSeat().getSeatCode())).containsExactly("BK-COUNTER");
    assertThat(search(String.valueOf(counterTicket.getId()))).contains("BK-COUNTER");
    // "%" là ký tự thường: chỉ khớp phim tên "Dune 50%", không phải mọi đơn.
    assertThat(search("50%")).containsExactly("BK-ONLINE");
    assertThat(search("_")).isEmpty();
  }

  @Test
  void searchFiltersByStatusPaymentAndDates() {
    Booking paid = booking("BK-1", northToday, BookingStatus.COMPLETED, PaymentStatus.PAID, 2);
    paid.getTickets().getFirst().setCheckedInAt(START.plusHours(18));
    Booking pending = booking("BK-2", northTomorrow, BookingStatus.PENDING, PaymentStatus.PENDING);
    Booking noPayment = booking("BK-3", northToday, BookingStatus.CANCELLED, null);
    save(paid, pending, noPayment);
    setTimestamps(paid, START.minusDays(2), START.minusDays(2));
    setTimestamps(pending, START.plusHours(1), START.plusHours(1));
    setTimestamps(noPayment, START.plusHours(2), START.plusHours(2));

    assertThat(search(filter().status(BookingStatus.PENDING))).containsExactly("BK-2");
    assertThat(search(filter().payment(PaymentStatus.PAID))).containsExactly("BK-1");
    assertThat(search(filter().noPayment())).containsExactly("BK-3");
    assertThat(search(filter().created(START, END))).containsExactly("BK-3", "BK-2");
    assertThat(search(filter().showtime(START, END))).containsExactly("BK-3", "BK-1");
    assertThat(search(filter().checkedIn(START, END))).containsExactly("BK-1");
    assertThat(search(filter().branch(south.getBranchId()))).isEmpty();
  }

  // ===== Dữ liệu mẫu =====

  private List<String> search(String text) {
    return search(filter().text(text));
  }

  private List<String> search(FilterBuilder builder) {
    return codesOf(bookings.searchIds(builder.build(), PageRequest.of(0, 50)).getContent());
  }

  private FilterBuilder filter() {
    return new FilterBuilder();
  }

  private static final class FilterBuilder {
    private Long branchId;
    private String text;
    private BookingStatus status;
    private PaymentStatus payment;
    private boolean noPayment;
    private LocalDateTime[] created = new LocalDateTime[2];
    private LocalDateTime[] showtime = new LocalDateTime[2];
    private LocalDateTime[] checkedIn = new LocalDateTime[2];

    FilterBuilder branch(Long value) {
      branchId = value;
      return this;
    }

    FilterBuilder text(String value) {
      text = value;
      return this;
    }

    FilterBuilder status(BookingStatus value) {
      status = value;
      return this;
    }

    FilterBuilder payment(PaymentStatus value) {
      payment = value;
      return this;
    }

    FilterBuilder noPayment() {
      noPayment = true;
      return this;
    }

    FilterBuilder created(LocalDateTime from, LocalDateTime to) {
      created = new LocalDateTime[] {from, to};
      return this;
    }

    FilterBuilder showtime(LocalDateTime from, LocalDateTime to) {
      showtime = new LocalDateTime[] {from, to};
      return this;
    }

    FilterBuilder checkedIn(LocalDateTime from, LocalDateTime to) {
      checkedIn = new LocalDateTime[] {from, to};
      return this;
    }

    BookingSearchFilter build() {
      return new BookingSearchFilter(
          branchId,
          text,
          status,
          payment,
          noPayment,
          created[0],
          created[1],
          showtime[0],
          showtime[1],
          checkedIn[0],
          checkedIn[1]);
    }
  }

  private Booking booking(
      String code, Showtime showtime, BookingStatus status, PaymentStatus paymentStatus) {
    return booking(code, showtime, status, paymentStatus, 1);
  }

  private Booking booking(
      String code,
      Showtime showtime,
      BookingStatus status,
      PaymentStatus paymentStatus,
      int ticketCount) {
    Booking booking =
        Booking.builder()
            .bookingCode(code)
            .showtime(showtime)
            .status(status)
            .totalAmount(new BigDecimal("100000"))
            .build();
    Payment payment = new Payment();
    payment.setPaymentStatus(paymentStatus);
    booking.setPayment(payment);
    for (int i = 0; i < ticketCount; i++) {
      Seat seat =
          Seat.builder()
              .room(showtime.getRoom())
              .seatCode("Z" + (++seatCounter))
              .rowLabel("Z")
              .seatNumber(seatCounter)
              .build();
      booking
          .getTickets()
          .add(
              Ticket.builder()
                  .booking(booking)
                  .showtime(showtime)
                  .seat(seat)
                  .price(new BigDecimal("50000"))
                  .ticketStatus(TicketStatus.BOOKED)
                  .build());
    }
    booking
        .getBookingFoods()
        .add(
            BookingFood.builder()
                .booking(booking)
                .food(popcorn)
                .quantity(1)
                .unitPrice(new BigDecimal("40000"))
                .subtotal(new BigDecimal("40000"))
                .build());
    return booking;
  }

  private void save(Booking... toSave) {
    for (Booking booking : toSave) {
      em.persist(booking);
      for (Ticket ticket : booking.getTickets()) {
        em.persist(ticket.getSeat());
        em.persist(ticket);
      }
    }
    em.flush();
  }

  /**
   * @CreationTimestamp/@UpdateTimestamp ghi đè giá trị đặt sẵn, nên chỉnh bằng câu UPDATE.
   */
  private void setTimestamps(Booking booking, LocalDateTime createdAt, LocalDateTime updatedAt) {
    em.createQuery("update Booking b set b.createdAt = :c, b.updatedAt = :u where b.id = :id")
        .setParameter("c", createdAt)
        .setParameter("u", updatedAt)
        .setParameter("id", booking.getId())
        .executeUpdate();
    em.clear();
  }

  private List<String> codesOf(List<Long> ids) {
    em.clear();
    return ids.stream().map(id -> em.find(Booking.class, id).getBookingCode()).toList();
  }

  private static List<String> codes(List<Booking> list) {
    return list.stream().map(Booking::getBookingCode).toList();
  }

  private <T> T persist(T entity) {
    em.persist(entity);
    return entity;
  }

  private static User user(String username, UserRole role, Long branchId) {
    return User.builder()
        .username(username)
        .password("x")
        .role(role)
        .status(UserStatus.ACTIVE)
        .branchId(branchId)
        .build();
  }

  private static Room room(Branch branch, String code) {
    return Room.builder().code(code).name(code).branch(branch).build();
  }

  private static Showtime showtime(Room room, Movie movie, LocalDateTime startTime) {
    return Showtime.builder()
        .room(room)
        .movie(movie)
        .startTime(startTime)
        .endTime(startTime.plusHours(2))
        .status(ShowtimeStatus.OPEN)
        .build();
  }
}
