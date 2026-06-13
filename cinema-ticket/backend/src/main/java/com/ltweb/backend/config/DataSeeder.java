package com.ltweb.backend.config;

import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.repository.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * DataSeeder — Chạy khi khởi động ứng dụng.
 *  1. Xóa showtime + booking cũ hơn 30 ngày (SQL thuần, đúng thứ tự FK)
 *  2. Sinh showtime mới (hôm nay → +14 ngày)
 *  3. Sinh booking / ticket mẫu thực tế
 *  4. Sinh booking hoàn vé mẫu
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

  private final ShowtimeRepository  showtimeRepository;
  private final BookingRepository   bookingRepository;
  private final TicketRepository    ticketRepository;
  private final MovieRepository     movieRepository;
  private final RoomRepository      roomRepository;
  private final SeatRepository      seatRepository;
  private final UserRepository      userRepository;
  private final FoodRepository      foodRepository;
  private final JdbcTemplate        jdbcTemplate;

  private static final Random RANDOM = new Random(42);

  private static final int[][] TIME_SLOTS = {
    {8, 30}, {10, 45}, {13, 0}, {15, 30}, {18, 0}, {20, 30}, {22, 45}
  };

  // ══════════════════════════════════════════════════════
  @Override
  public void run(String... args) {
    log.info("=== DataSeeder START ===");
    try { cleanOldData();       } catch (Exception e) { log.warn("cleanOldData error: {}", e.getMessage()); }
    try { seedShowtimes();      } catch (Exception e) { log.warn("seedShowtimes error: {}", e.getMessage()); }
    try { seedSampleBookings(); } catch (Exception e) { log.warn("seedSampleBookings error: {}", e.getMessage()); }
    try { seedRefundBookings(); } catch (Exception e) { log.warn("seedRefundBookings error: {}", e.getMessage()); }
    log.info("=== DataSeeder DONE ===");
  }

  // ══════════════════════════════════════════════════════
  //  1. DỌN DỮ LIỆU CŨ — SQL thuần, đúng thứ tự FK
  // ══════════════════════════════════════════════════════
  private void cleanOldData() {
    String cutoff = LocalDateTime.now().minusDays(30)
        .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    log.info("Cleaning data older than {}", cutoff);

    // Thứ tự: tickets → booking_foods → bookings → showtimes
    int t1 = jdbcTemplate.update(
        "DELETE t FROM tickets t "
        + "JOIN bookings b ON t.booking_id = b.booking_id "
        + "JOIN showtimes s ON b.showtime_id = s.showtime_id "
        + "WHERE s.end_time < ?", cutoff);

    int t2 = jdbcTemplate.update(
        "DELETE t FROM tickets t "
        + "JOIN showtimes s ON t.showtime_id = s.showtime_id "
        + "WHERE s.end_time < ? AND t.booking_id IS NULL", cutoff);

    jdbcTemplate.update(
        "DELETE bf FROM booking_foods bf "
        + "JOIN bookings b ON bf.booking_id = b.booking_id "
        + "JOIN showtimes s ON b.showtime_id = s.showtime_id "
        + "WHERE s.end_time < ?", cutoff);

    int b1 = jdbcTemplate.update(
        "DELETE b FROM bookings b "
        + "JOIN showtimes s ON b.showtime_id = s.showtime_id "
        + "WHERE s.end_time < ?", cutoff);

    int s1 = jdbcTemplate.update(
        "DELETE FROM showtimes WHERE end_time < ?", cutoff);

    log.info("Cleaned: {} showtimes, {} bookings, {} tickets.", s1, b1, t1 + t2);
  }

  // ══════════════════════════════════════════════════════
  //  2. SINH SHOWTIME MỚI (hôm nay → +14 ngày)
  // ══════════════════════════════════════════════════════
  private void seedShowtimes() {
    List<Movie> movies = movieRepository.findAll().stream()
        .filter(m -> m.getStatus() == MovieStatus.NOW_SHOWING)
        .toList();

    if (movies.isEmpty()) {
      log.warn("No NOW_SHOWING movies — skipping showtime seed.");
      return;
    }

    List<Room> rooms = roomRepository.findAll().stream()
        .limit(5) // Tối đa 5 phòng để tránh quá nhiều showtime
        .toList();
    if (rooms.isEmpty()) {
      log.warn("No rooms — skipping showtime seed.");
      return;
    }

    int created = 0;
    LocalDate today = LocalDate.now();

    // Seed từ -7 ngày (quá khứ) đến +14 ngày (tương lai)
    // Quá khứ để có booking mẫu, tương lai để đặt vé
    for (int day = -7; day <= 14; day++) {
      LocalDate date = today.plusDays(day);
      for (Room room : rooms) {
        List<int[]> slots = pickSlots(2); // 2 suất/phòng/ngày
        for (int[] slot : slots) {
          Movie movie = movies.get(RANDOM.nextInt(movies.size()));
          int duration = movie.getDurationMinutes() != null ? movie.getDurationMinutes() : 120;
          LocalDateTime start = date.atTime(slot[0], slot[1]);
          LocalDateTime end   = start.plusMinutes(duration + 15);

          if (showtimeRepository.existsOverlappingShowtime(room.getId(), start, end)) continue;

          showtimeRepository.save(Showtime.builder()
              .room(room).movie(movie)
              .startTime(start).endTime(end)
              .status(ShowtimeStatus.OPEN)
              .build());
          created++;
        }
      }
    }
    log.info("Seeded {} new showtimes.", created);
  }

  // ══════════════════════════════════════════════════════
  //  3. SINH BOOKING MẪU
  // ══════════════════════════════════════════════════════
  private void seedSampleBookings() {
    long recent = bookingRepository.findAll().stream()
        .filter(b -> b.getCreatedAt() != null
            && b.getCreatedAt().isAfter(LocalDateTime.now().minusDays(7)))
        .count();
    if (recent >= 20) {
      log.info("Already {} recent bookings — skip.", recent);
      return;
    }

    List<User> customers = userRepository.findAll().stream()
        .filter(u -> u.getRole() == UserRole.USER).limit(10).toList();
    if (customers.isEmpty()) { log.warn("No customers."); return; }

    LocalDateTime from = LocalDateTime.now().minusDays(7);
    LocalDateTime to   = LocalDateTime.now().minusHours(1);

    List<Showtime> past = showtimeRepository.findAll().stream()
        .filter(s -> s.getEndTime() != null
            && s.getEndTime().isAfter(from) && s.getEndTime().isBefore(to))
        .toList();
    if (past.isEmpty()) { log.warn("No past showtimes — skip booking seed."); return; }

    List<Food> foods = foodRepository.findAll();

    // Map<showtimeId, Set<seatId>> — track ghế đã dùng (DB + session hiện tại)
    Map<Long, Set<Long>> used = new HashMap<>();
    ticketRepository.findAll().forEach(t -> {
      if (t.getShowtime() != null && t.getSeat() != null) {
        used.computeIfAbsent(t.getShowtime().getId(), k -> new HashSet<>())
            .add(t.getSeat().getId());
      }
    });

    List<Showtime> shuffled = new ArrayList<>(past);
    Collections.shuffle(shuffled, RANDOM);
    int target = Math.min(30, shuffled.size());
    int count  = 0;

    for (int i = 0; i < target; i++) {
      Showtime st   = shuffled.get(i % shuffled.size());
      User     user = customers.get(RANDOM.nextInt(customers.size()));

      Set<Long> usedIds = used.getOrDefault(st.getId(), Collections.emptySet());
      List<Seat> avail = seatRepository.findByRoomId(st.getRoom().getId()).stream()
          .filter(s -> Boolean.TRUE.equals(s.getIsActive()) && !usedIds.contains(s.getId()))
          .toList();
      if (avail.isEmpty()) continue;

      List<Seat> picked  = pickSeats(avail, 1 + RANDOM.nextInt(Math.min(3, avail.size())));
      // Đánh dấu ngay vào map trước khi save
      Set<Long> stUsed = used.computeIfAbsent(st.getId(), k -> new HashSet<>());
      picked.forEach(s -> stUsed.add(s.getId()));

      BigDecimal total = picked.stream().map(s -> price(s.getSeatType()))
          .reduce(BigDecimal.ZERO, BigDecimal::add);

      PaymentMethod method = pickPaymentMethod();
      LocalDateTime paid   = st.getStartTime().minusHours(RANDOM.nextInt(24) + 1);
      String code = bookingCode(st, user, i);

      Booking booking = Booking.builder()
          .bookingCode(code).user(user).showtime(st)
          .totalAmount(total).discountAmount(BigDecimal.ZERO)
          .status(BookingStatus.COMPLETED)
          .paymentMethod(method).paymentStatus(PaymentStatus.PAID)
          .paidAt(paid).paymentCreatedAt(paid.minusMinutes(5))
          .providerTxnId(method == PaymentMethod.VNPAY ? "VNP" + System.nanoTime() : null)
          .build();

      if (!foods.isEmpty() && RANDOM.nextBoolean()) {
        Food f = foods.get(RANDOM.nextInt(foods.size()));
        int  q = 1 + RANDOM.nextInt(3);
        BigDecimal sub = f.getPrice().multiply(BigDecimal.valueOf(q));
        booking.getBookingFoods().add(BookingFood.builder()
            .booking(booking).food(f).quantity(q)
            .unitPrice(f.getPrice()).subtotal(sub).build());
        booking.setTotalAmount(total.add(sub));
      }

      bookingRepository.save(booking);

      for (Seat seat : picked) {
        try {
          ticketRepository.save(Ticket.builder()
              .booking(booking).showtime(st).seat(seat)
              .price(price(seat.getSeatType()))
              .ticketStatus(TicketStatus.BOOKED)
              .qrCode("QR-" + code + "-" + seat.getSeatCode())
              .build());
        } catch (Exception ex) {
          log.warn("Skip dup ticket st={} seat={}", st.getId(), seat.getSeatCode());
        }
      }

      BigDecimal cur = user.getTotalSpending() != null ? user.getTotalSpending() : BigDecimal.ZERO;
      BigDecimal add = booking.getTotalAmount()  != null ? booking.getTotalAmount()  : BigDecimal.ZERO;
      user.setTotalSpending(cur.add(add));
      user.setMembershipTier(MembershipTier.fromSpending(user.getTotalSpending()));
      userRepository.save(user);
      count++;
    }
    log.info("Seeded {} sample bookings.", count);
  }

  // ══════════════════════════════════════════════════════
  //  4. SINH BOOKING HOÀN VÉ MẪU
  // ══════════════════════════════════════════════════════
  private void seedRefundBookings() {
    long existing = bookingRepository.findAll().stream()
        .filter(b -> b.getStatus() == BookingStatus.REFUND_REQUESTED
            || b.getStatus() == BookingStatus.REFUNDED)
        .count();
    if (existing >= 3) { log.info("Already {} refund bookings — skip.", existing); return; }

    List<User> customers = userRepository.findAll().stream()
        .filter(u -> u.getRole() == UserRole.USER).limit(10).toList();
    if (customers.isEmpty()) { log.warn("No customers."); return; }

    Optional<User> admin = userRepository.findAll().stream()
        .filter(u -> u.getRole() == UserRole.ADMIN || u.getRole() == UserRole.MANAGER)
        .findFirst();

    LocalDateTime from = LocalDateTime.now().minusDays(14);
    LocalDateTime to   = LocalDateTime.now().minusDays(1);

    List<Showtime> past = showtimeRepository.findAll().stream()
        .filter(s -> s.getEndTime() != null
            && s.getEndTime().isAfter(from) && s.getEndTime().isBefore(to))
        .toList();
    if (past.isEmpty()) { log.warn("No past showtimes for refund seed."); return; }

    // Dùng id-based set cho refund cũng để tránh trùng
    Map<Long, Set<Long>> used = new HashMap<>();
    ticketRepository.findAll().forEach(t -> {
      if (t.getShowtime() != null && t.getSeat() != null) {
        used.computeIfAbsent(t.getShowtime().getId(), k -> new HashSet<>())
            .add(t.getSeat().getId());
      }
    });

    int total = 0;

    // 3 REFUND_REQUESTED
    for (int i = 0; i < 3 && i < past.size(); i++) {
      total += saveRefundBooking(past, customers, used, BookingStatus.REFUND_REQUESTED,
          PaymentStatus.PAID, null, i);
    }
    // 2 REFUNDED
    for (int i = 0; i < 2 && i < past.size(); i++) {
      total += saveRefundBooking(past, customers, used, BookingStatus.REFUNDED,
          PaymentStatus.REFUNDED, admin.orElse(null), i + 10);
    }
    log.info("Seeded {} refund bookings.", total);
  }

  private int saveRefundBooking(List<Showtime> past, List<User> customers,
      Map<Long, Set<Long>> used, BookingStatus status, PaymentStatus payStatus,
      User admin, int idx) {
    Showtime st   = past.get(RANDOM.nextInt(past.size()));
    User     user = customers.get(RANDOM.nextInt(customers.size()));

    Set<Long> usedIds = used.getOrDefault(st.getId(), Collections.emptySet());
    List<Seat> avail = seatRepository.findByRoomId(st.getRoom().getId()).stream()
        .filter(s -> Boolean.TRUE.equals(s.getIsActive()) && !usedIds.contains(s.getId()))
        .toList();
    if (avail.isEmpty()) return 0;

    List<Seat> picked = pickSeats(avail, Math.min(2, avail.size()));
    Set<Long> stUsed = used.computeIfAbsent(st.getId(), k -> new HashSet<>());
    picked.forEach(s -> stUsed.add(s.getId()));

    BigDecimal amt    = picked.stream().map(s -> price(s.getSeatType())).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal refAmt = status == BookingStatus.REFUNDED ? amt.multiply(new BigDecimal("0.8")) : amt;

    LocalDateTime paid      = st.getStartTime().minusHours(RANDOM.nextInt(12) + 2);
    LocalDateTime refundedAt = status == BookingStatus.REFUNDED ? st.getStartTime().minusHours(5) : null;
    String code = bookingCode(st, user, idx);

    Booking booking = Booking.builder()
        .bookingCode(code).user(user).showtime(st)
        .totalAmount(amt).discountAmount(BigDecimal.ZERO)
        .status(status).paymentMethod(PaymentMethod.VNPAY).paymentStatus(payStatus)
        .paidAt(paid).paymentCreatedAt(paid.minusMinutes(5))
        .providerTxnId("VNP" + System.nanoTime() + idx)
        .refundReason(pickRefundReason()).refundAmount(refAmt)
        .refundedAt(refundedAt).refundProcessedAt(refundedAt)
        .refundProcessNote(status == BookingStatus.REFUNDED
            ? "Đã hoàn " + refAmt.toPlainString() + " VNĐ (80%)." : null)
        .refundProcessedBy(admin)
        .build();

    bookingRepository.save(booking);

    for (Seat seat : picked) {
      try {
        ticketRepository.save(Ticket.builder()
            .booking(booking).showtime(st).seat(seat)
            .price(price(seat.getSeatType()))
            .ticketStatus(TicketStatus.BOOKED)
            .qrCode("QR-" + code + "-" + seat.getSeatCode())
            .build());
      } catch (Exception ex) {
        log.warn("Skip dup refund ticket st={} seat={}", st.getId(), seat.getSeatCode());
      }
    }
    return 1;
  }

  // ══════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════

  private static final String[] REFUND_REASONS = {
    "Bận công việc đột xuất không thể đến xem",
    "Mua nhầm suất chiếu",
    "Sự cố cá nhân phát sinh",
    "Mua nhầm rạp chiếu",
    "Có việc gia đình khẩn cấp"
  };

  private String pickRefundReason() {
    return REFUND_REASONS[RANDOM.nextInt(REFUND_REASONS.length)];
  }

  private List<int[]> pickSlots(int count) {
    List<int[]> all = new ArrayList<>(Arrays.asList(TIME_SLOTS));
    Collections.shuffle(all, RANDOM);
    return all.subList(0, Math.min(count, all.size()));
  }

  private List<Seat> pickSeats(List<Seat> avail, int count) {
    List<Seat> copy = new ArrayList<>(avail);
    Collections.shuffle(copy, RANDOM);
    return copy.subList(0, Math.min(count, copy.size()));
  }

  private BigDecimal price(SeatType type) {
    if (type == null) return new BigDecimal("80000");
    return switch (type) {
      case VIP    -> new BigDecimal("120000");
      case COUPLE -> new BigDecimal("180000");
      default     -> new BigDecimal("80000");
    };
  }

  private PaymentMethod pickPaymentMethod() {
    int r = RANDOM.nextInt(10);
    if (r < 6) return PaymentMethod.VNPAY;
    if (r < 8) return PaymentMethod.CASH;
    return PaymentMethod.CARD;
  }

  private String bookingCode(Showtime st, User user, int idx) {
    String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
    return String.format("BK%s%d%d%s", date, st.getId(), user.getId(),
        Integer.toHexString(RANDOM.nextInt(0xFFFF) + idx).toUpperCase());
  }
}
