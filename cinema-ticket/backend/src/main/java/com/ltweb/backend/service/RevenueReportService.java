package com.ltweb.backend.service;

import com.ltweb.backend.dto.response.RevenueReportResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RevenueReportService {
  private final BookingRepository bookingRepository;
  private final UserRepository userRepository;

  @Transactional(readOnly = true)
  public RevenueReportResponse getReport(
      LocalDate fromDate,
      LocalDate toDate,
      Long branchId,
      Long movieId,
      Long staffId,
      PaymentMethod paymentMethod) {
    LocalDate to = toDate == null ? LocalDate.now() : toDate;
    LocalDate from = fromDate == null ? to.minusDays(29) : fromDate;
    if (from.isAfter(to)) {
      LocalDate temp = from;
      from = to;
      to = temp;
    }
    LocalDateTime start = from.atStartOfDay();
    LocalDateTime end = to.plusDays(1).atStartOfDay();
    User user = getCurrentUser();
    Long scopedBranchId = resolveScopedBranchId(user, branchId);

    List<Booking> bookings =
        bookingRepository.findAll().stream()
            .filter(this::isPaidBooking)
            .filter(booking -> isInRange(getPaymentDate(booking), start, end))
            .filter(booking -> scopedBranchId == null || Objects.equals(getBranchId(booking), scopedBranchId))
            .filter(booking -> movieId == null || Objects.equals(getMovieId(booking), movieId))
            .filter(booking -> staffId == null || Objects.equals(getStaffId(booking), staffId))
            .filter(booking -> paymentMethod == null || booking.getPaymentMethod() == paymentMethod)
            .sorted(Comparator.comparing(this::getPaymentDate).reversed())
            .toList();

    BigDecimal revenue = sumBookingRevenue(bookings);
    return RevenueReportResponse.builder()
        .fromDate(from)
        .toDate(to)
        .summary(
            RevenueReportResponse.Summary.builder()
                .revenue(revenue)
                .ticketRevenue(sumTicketRevenue(bookings))
                .foodRevenue(sumFoodRevenue(bookings))
                .bookings(bookings.size())
                .ticketsSold(countTickets(bookings))
                .averageOrderValue(average(revenue, bookings.size()))
                .build())
        .rows(bookings.stream().limit(200).map(this::toRow).toList())
        .branchBreakdown(buildBreakdown(bookings, this::getBranchId, this::getBranchName))
        .movieBreakdown(buildBreakdown(bookings, this::getMovieId, this::getMovieName))
        .staffBreakdown(buildBreakdown(bookings, this::getStaffId, this::getStaffName))
        .paymentBreakdown(buildPaymentBreakdown(bookings))
        .build();
  }

  private List<RevenueReportResponse.Breakdown> buildBreakdown(
      List<Booking> bookings, Function<Booking, Long> idFn, Function<Booking, String> nameFn) {
    return bookings.stream()
        .collect(Collectors.groupingBy(booking -> Objects.requireNonNullElse(idFn.apply(booking), -1L)))
        .entrySet()
        .stream()
        .map(entry -> {
          Booking sample = entry.getValue().getFirst();
          return RevenueReportResponse.Breakdown.builder()
              .id(entry.getKey() < 0 ? null : entry.getKey())
              .name(Objects.requireNonNullElse(nameFn.apply(sample), "Khong xac dinh"))
              .revenue(sumBookingRevenue(entry.getValue()))
              .bookings(entry.getValue().size())
              .ticketsSold(countTickets(entry.getValue()))
              .build();
        })
        .sorted(Comparator.comparing(RevenueReportResponse.Breakdown::getRevenue).reversed())
        .limit(20)
        .toList();
  }

  private List<RevenueReportResponse.PaymentBreakdown> buildPaymentBreakdown(List<Booking> bookings) {
    Map<PaymentMethod, List<Booking>> grouped =
        bookings.stream()
            .collect(Collectors.groupingBy(booking -> booking.getPaymentMethod() == null ? PaymentMethod.VNPAY : booking.getPaymentMethod()));
    return grouped.entrySet().stream()
        .map(entry -> RevenueReportResponse.PaymentBreakdown.builder()
            .paymentMethod(entry.getKey())
            .revenue(sumBookingRevenue(entry.getValue()))
            .bookings(entry.getValue().size())
            .build())
        .sorted(Comparator.comparing(RevenueReportResponse.PaymentBreakdown::getRevenue).reversed())
        .toList();
  }

  private RevenueReportResponse.Row toRow(Booking booking) {
    return RevenueReportResponse.Row.builder()
        .bookingId(booking.getId())
        .bookingCode(booking.getBookingCode())
        .branchName(getBranchName(booking))
        .movieName(getMovieName(booking))
        .staffUsername(getStaffName(booking))
        .paymentMethod(booking.getPaymentMethod())
        .totalAmount(safeAmount(booking.getTotalAmount()))
        .ticketAmount(sumTicketRevenue(List.of(booking)))
        .foodAmount(sumFoodRevenue(List.of(booking)))
        .ticketsSold(getTicketCount(booking))
        .paidAt(getPaymentDate(booking))
        .build();
  }

  private Long resolveScopedBranchId(User user, Long branchId) {
    if (user.getRole() == UserRole.ADMIN) {
      return branchId;
    }
    if (user.getRole() == UserRole.MANAGER) {
      if (user.getBranchId() == null) {
        throw new AccessDeniedException("Manager is not assigned to a branch");
      }
      if (branchId != null && !Objects.equals(user.getBranchId(), branchId)) {
        throw new AccessDeniedException("Branch access denied");
      }
      return user.getBranchId();
    }
    throw new AccessDeniedException("Revenue report access denied");
  }

  private boolean isPaidBooking(Booking booking) {
    return booking.getStatus() == BookingStatus.COMPLETED
        || booking.getPaymentStatus() == PaymentStatus.PAID;
  }

  private boolean isInRange(LocalDateTime value, LocalDateTime start, LocalDateTime end) {
    return value != null && !value.isBefore(start) && value.isBefore(end);
  }

  private LocalDateTime getPaymentDate(Booking booking) {
    if (booking.getPaidAt() != null) return booking.getPaidAt();
    if (booking.getUpdatedAt() != null) return booking.getUpdatedAt();
    return Objects.requireNonNullElseGet(booking.getCreatedAt(), LocalDateTime::now);
  }

  private BigDecimal sumBookingRevenue(List<Booking> bookings) {
    return bookings.stream().map(Booking::getTotalAmount).map(this::safeAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal sumTicketRevenue(List<Booking> bookings) {
    return bookings.stream()
        .flatMap(booking -> getTickets(booking).stream())
        .map(ticket -> safeAmount(ticket.getPrice()))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal sumFoodRevenue(List<Booking> bookings) {
    return bookings.stream()
        .flatMap(booking -> getBookingFoods(booking).stream())
        .map(food -> safeAmount(food.getSubtotal()))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal average(BigDecimal total, long count) {
    if (count <= 0) return BigDecimal.ZERO;
    return total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
  }

  private long countTickets(List<Booking> bookings) {
    return bookings.stream().mapToLong(this::getTicketCount).sum();
  }

  private long getTicketCount(Booking booking) {
    return getTickets(booking).size();
  }

  private List<Ticket> getTickets(Booking booking) {
    return booking.getTickets() == null ? List.of() : booking.getTickets();
  }

  private List<BookingFood> getBookingFoods(Booking booking) {
    return booking.getBookingFoods() == null ? List.of() : booking.getBookingFoods();
  }

  private Long getBranchId(Booking booking) {
    return booking.getShowtime() == null
        || booking.getShowtime().getRoom() == null
        || booking.getShowtime().getRoom().getBranch() == null
        ? null
        : booking.getShowtime().getRoom().getBranch().getBranchId();
  }

  private String getBranchName(Booking booking) {
    return booking.getShowtime() == null
        || booking.getShowtime().getRoom() == null
        || booking.getShowtime().getRoom().getBranch() == null
        ? null
        : booking.getShowtime().getRoom().getBranch().getName();
  }

  private Long getMovieId(Booking booking) {
    return booking.getShowtime() == null || booking.getShowtime().getMovie() == null
        ? null
        : booking.getShowtime().getMovie().getId();
  }

  private String getMovieName(Booking booking) {
    return booking.getShowtime() == null || booking.getShowtime().getMovie() == null
        ? null
        : booking.getShowtime().getMovie().getMovieName();
  }

  private Long getStaffId(Booking booking) {
    return booking.getStaffUser() == null ? null : booking.getStaffUser().getId();
  }

  private String getStaffName(Booking booking) {
    return booking.getStaffUser() == null ? "Online" : booking.getStaffUser().getUsername();
  }

  private BigDecimal safeAmount(BigDecimal amount) {
    return amount == null ? BigDecimal.ZERO : amount;
  }

  private User getCurrentUser() {
    return userRepository
        .findByUsername(SecurityContextHolder.getContext().getAuthentication().getName())
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }
}
