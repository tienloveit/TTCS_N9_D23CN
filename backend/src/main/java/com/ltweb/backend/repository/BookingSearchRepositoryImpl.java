package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Payment;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/** Fragment của {@link BookingRepository}: dựng điều kiện một lần, dùng cho trang, đếm và tổng. */
class BookingSearchRepositoryImpl implements BookingSearchRepository {
  private static final char LIKE_ESCAPE = '!';

  @PersistenceContext private EntityManager entityManager;

  @Override
  public Page<Long> searchIds(BookingSearchFilter filter, Pageable pageable) {
    CriteriaBuilder cb = entityManager.getCriteriaBuilder();

    CriteriaQuery<Long> idQuery = cb.createQuery(Long.class);
    Root<Booking> booking = idQuery.from(Booking.class);
    idQuery
        .select(booking.get("id"))
        .where(predicates(cb, idQuery, booking, filter))
        .orderBy(cb.desc(booking.get("createdAt")), cb.desc(booking.get("id")));
    List<Long> ids =
        entityManager
            .createQuery(idQuery)
            .setFirstResult((int) pageable.getOffset())
            .setMaxResults(pageable.getPageSize())
            .getResultList();

    CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
    Root<Booking> counted = countQuery.from(Booking.class);
    countQuery.select(cb.count(counted)).where(predicates(cb, countQuery, counted, filter));
    long total = entityManager.createQuery(countQuery).getSingleResult();

    return new PageImpl<>(ids, pageable, total);
  }

  @Override
  public Totals totals(BookingSearchFilter filter) {
    CriteriaBuilder cb = entityManager.getCriteriaBuilder();
    CriteriaQuery<Tuple> query = cb.createTupleQuery();
    Root<Booking> booking = query.from(Booking.class);
    Join<Booking, Payment> payment = payment(booking);
    Path<BookingStatus> status = booking.get("status");
    query
        .multiselect(
            cb.sum(countIf(cb, cb.equal(status, BookingStatus.COMPLETED))),
            cb.sum(countIf(cb, cb.equal(status, BookingStatus.REFUND_REQUESTED))),
            cb.sum(
                cb.<BigDecimal>selectCase()
                    .when(
                        cb.equal(payment.get("paymentStatus"), PaymentStatus.PAID),
                        booking.<BigDecimal>get("totalAmount"))
                    .otherwise(cb.literal(BigDecimal.ZERO))))
        .where(predicates(cb, query, booking, filter));
    Tuple row = entityManager.createQuery(query).getSingleResult();
    return new Totals(
        asLong(row.get(0)), asLong(row.get(1)), asDecimal(row.get(2, BigDecimal.class)));
  }

  private Predicate[] predicates(
      CriteriaBuilder cb, CriteriaQuery<?> query, Root<Booking> booking, BookingSearchFilter f) {
    List<Predicate> where = new ArrayList<>();
    var showtime = booking.join("showtime");
    var branch = showtime.join("room").join("branch");

    if (f.branchId() != null) {
      where.add(cb.equal(branch.get("branchId"), f.branchId()));
    }
    if (f.status() != null) {
      where.add(cb.equal(booking.get("status"), f.status()));
    }
    if (f.paymentStatus() != null || f.noPaymentStatus()) {
      Path<PaymentStatus> paymentStatus = payment(booking).get("paymentStatus");
      where.add(
          f.noPaymentStatus()
              ? cb.isNull(paymentStatus)
              : cb.equal(paymentStatus, f.paymentStatus()));
    }
    addRange(cb, where, booking.get("createdAt"), f.createdFrom(), f.createdTo());
    addRange(cb, where, showtime.get("startTime"), f.showtimeFrom(), f.showtimeTo());
    if (f.checkedInFrom() != null || f.checkedInTo() != null) {
      Subquery<Long> checkedIn = query.subquery(Long.class);
      Root<Ticket> ticket = checkedIn.from(Ticket.class);
      List<Predicate> ticketWhere = new ArrayList<>();
      ticketWhere.add(cb.equal(ticket.get("booking"), booking));
      addRange(cb, ticketWhere, ticket.get("checkedInAt"), f.checkedInFrom(), f.checkedInTo());
      checkedIn.select(cb.literal(1L)).where(ticketWhere.toArray(Predicate[]::new));
      where.add(cb.exists(checkedIn));
    }
    if (f.query() != null && !f.query().isBlank()) {
      where.add(matchesQuery(cb, query, booking, showtime, branch, f.query().strip()));
    }
    return where.toArray(Predicate[]::new);
  }

  private Predicate matchesQuery(
      CriteriaBuilder cb,
      CriteriaQuery<?> query,
      Root<Booking> booking,
      Join<?, ?> showtime,
      Join<?, ?> branch,
      String text) {
    String pattern = "%" + escapeLike(text.toLowerCase(Locale.ROOT)) + "%";
    var user = booking.join("user", JoinType.LEFT);

    Subquery<Long> ticketMatch = query.subquery(Long.class);
    Root<Ticket> ticket = ticketMatch.from(Ticket.class);
    Join<Ticket, Seat> seat = ticket.join("seat");
    Predicate ticketText = like(cb, seat.get("seatCode"), pattern);
    Long ticketId = parseId(text);
    if (ticketId != null) {
      ticketText = cb.or(ticketText, cb.equal(ticket.get("id"), ticketId));
    }
    ticketMatch.select(cb.literal(1L)).where(cb.equal(ticket.get("booking"), booking), ticketText);

    return cb.or(
        like(cb, booking.get("bookingCode"), pattern),
        like(cb, user.get("username"), pattern),
        like(cb, showtime.join("movie").get("movieName"), pattern),
        like(cb, branch.get("name"), pattern),
        cb.exists(ticketMatch));
  }

  @SuppressWarnings("unchecked")
  private static Join<Booking, Payment> payment(Root<Booking> booking) {
    // Tái sử dụng join đã có trong cùng truy vấn để không join payments hai lần.
    return booking.getJoins().stream()
        .filter(join -> "payment".equals(join.getAttribute().getName()))
        .map(join -> (Join<Booking, Payment>) join)
        .findFirst()
        .orElseGet(() -> booking.join("payment", JoinType.LEFT));
  }

  private static void addRange(
      CriteriaBuilder cb,
      List<Predicate> where,
      Path<LocalDateTime> value,
      LocalDateTime from,
      LocalDateTime to) {
    if (from != null) {
      where.add(cb.greaterThanOrEqualTo(value, from));
    }
    if (to != null) {
      where.add(cb.lessThan(value, to));
    }
  }

  private static Predicate like(CriteriaBuilder cb, Path<String> value, String pattern) {
    return cb.like(cb.lower(value), pattern, LIKE_ESCAPE);
  }

  private static Expression<Long> countIf(CriteriaBuilder cb, Predicate condition) {
    return cb.<Long>selectCase().when(condition, cb.literal(1L)).otherwise(cb.literal(0L));
  }

  static String escapeLike(String text) {
    StringBuilder escaped = new StringBuilder(text.length());
    for (char c : text.toCharArray()) {
      if (c == '%' || c == '_' || c == LIKE_ESCAPE) {
        escaped.append(LIKE_ESCAPE);
      }
      escaped.append(c);
    }
    return escaped.toString();
  }

  private static Long parseId(String text) {
    if (text.isEmpty() || text.length() > 18 || !text.chars().allMatch(Character::isDigit)) {
      return null;
    }
    return Long.valueOf(text);
  }

  private static long asLong(Object value) {
    return value == null ? 0 : ((Number) value).longValue();
  }

  private static BigDecimal asDecimal(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }
}
