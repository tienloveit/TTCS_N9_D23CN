package com.ltweb.backend.service;

import com.ltweb.backend.dto.response.OperationsReportResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.BranchRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OperationsReportService {
  private final java.time.Clock clock;
  private final BookingRepository bookingRepository;
  private final ShowtimeRepository showtimeRepository;
  private final TicketRepository ticketRepository;
  private final UserRepository userRepository;
  private final BranchRepository branchRepository;

  @Transactional(readOnly = true)
  public OperationsReportResponse getDailyReport(LocalDate reportDate, Long requestedBranchId) {
    LocalDate date = reportDate == null ? LocalDate.now(clock) : reportDate;
    LocalDateTime start = date.atStartOfDay();
    LocalDateTime end = date.plusDays(1).atStartOfDay();
    User currentUser = getCurrentUser();
    Long scopedBranchId = resolveScopedBranchId(currentUser, requestedBranchId);

    List<Booking> paidToday =
        bookingRepository.findPaidByPaymentDate(
            start, end, LocalDateTime.now(clock), scopedBranchId, null, null, null);
    long pendingToday =
        bookingRepository.countByStatusCreatedBetween(
            BookingStatus.PENDING, start, end, scopedBranchId);
    List<Booking> refundRequests =
        findByStatusInScope(BookingStatus.REFUND_REQUESTED, scopedBranchId).stream()
            .sorted(Comparator.comparing(this::getPaymentDate).reversed())
            .toList();
    BigDecimal refundedAmount = bookingRepository.sumRefundedAmount(start, end, scopedBranchId);

    List<Showtime> showtimesToday =
        showtimeRepository.findStartingBetween(start, end, scopedBranchId);
    Map<Long, Long> capacityByShowtime = countTicketsByShowtime(showtimesToday);
    Map<Long, Long> soldByShowtime =
        bookingRepository.findPaidByShowtimeStart(start, end, scopedBranchId).stream()
            .collect(
                Collectors.groupingBy(
                    booking -> booking.getShowtime().getId(),
                    Collectors.summingLong(this::getTicketCount)));
    long capacity = capacityByShowtime.values().stream().mapToLong(Long::longValue).sum();
    long ticketsSoldByShowtimeDate =
        soldByShowtime.values().stream().mapToLong(Long::longValue).sum();
    return OperationsReportResponse.builder()
        .reportDate(date)
        .branchId(scopedBranchId)
        .branchName(getBranchName(scopedBranchId))
        .summary(
            OperationsReportResponse.Summary.builder()
                .revenue(sumBookingRevenue(paidToday))
                .ticketRevenue(sumTicketRevenue(paidToday))
                .foodRevenue(sumFoodRevenue(paidToday))
                .refundedAmount(safeAmount(refundedAmount))
                .completedBookings(paidToday.size())
                .pendingBookings(pendingToday)
                .refundRequests(refundRequests.size())
                .ticketsSold(countTickets(paidToday))
                .showtimes(showtimesToday.size())
                .totalCapacity(capacity)
                .occupancyRate(toRate(ticketsSoldByShowtimeDate, capacity))
                .build())
        .paymentBreakdown(buildPaymentBreakdown(paidToday))
        .refundQueue(refundRequests.stream().limit(20).map(this::toRefundQueueItem).toList())
        .showtimeLoads(
            showtimesToday.stream()
                .map(
                    showtime ->
                        toShowtimeLoad(
                            showtime,
                            capacityByShowtime.getOrDefault(showtime.getId(), 0L),
                            soldByShowtime.getOrDefault(showtime.getId(), 0L)))
                .toList())
        .build();
  }

  private List<Booking> findByStatusInScope(BookingStatus status, Long branchId) {
    return branchId == null
        ? bookingRepository.findByStatusIn(List.of(status))
        : bookingRepository.findByBranchIdAndStatusIn(branchId, List.of(status));
  }

  /** Sức chứa của mỗi suất = số vé đã tạo cho suất, đếm gộp trong một truy vấn. */
  private Map<Long, Long> countTicketsByShowtime(List<Showtime> showtimes) {
    List<Long> showtimeIds =
        showtimes.stream().map(Showtime::getId).filter(Objects::nonNull).toList();
    if (showtimeIds.isEmpty()) {
      return Map.of();
    }
    return ticketRepository.countGroupedByShowtimeIds(showtimeIds).stream()
        .collect(Collectors.toMap(row -> (Long) row[0], row -> ((Number) row[1]).longValue()));
  }

  private List<OperationsReportResponse.PaymentBreakdown> buildPaymentBreakdown(
      List<Booking> bookings) {
    Map<PaymentMethod, List<Booking>> grouped =
        bookings.stream()
            .collect(
                Collectors.groupingBy(
                    booking ->
                        booking.getPayment().getPaymentMethod() == null
                            ? PaymentMethod.VNPAY
                            : booking.getPayment().getPaymentMethod()));
    return grouped.entrySet().stream()
        .sorted(Map.Entry.comparingByKey())
        .map(
            entry ->
                OperationsReportResponse.PaymentBreakdown.builder()
                    .paymentMethod(entry.getKey())
                    .amount(sumBookingRevenue(entry.getValue()))
                    .bookings(entry.getValue().size())
                    .build())
        .toList();
  }

  private OperationsReportResponse.RefundQueueItem toRefundQueueItem(Booking booking) {
    User customer = booking.getUser();
    return OperationsReportResponse.RefundQueueItem.builder()
        .bookingId(booking.getId())
        .bookingCode(booking.getBookingCode())
        .customerName(customer == null ? "-" : customer.getFullName())
        .amount(booking.getPayment().getRefundAmount())
        .reason(booking.getPayment().getRefundReason())
        .status(booking.getStatus())
        .paidAt(booking.getPayment().getPaidAt())
        .build();
  }

  private OperationsReportResponse.ShowtimeLoad toShowtimeLoad(
      Showtime showtime, long capacity, long sold) {
    return OperationsReportResponse.ShowtimeLoad.builder()
        .showtimeId(showtime.getId())
        .movieName(showtime.getMovie() == null ? "-" : showtime.getMovie().getMovieName())
        .roomName(showtime.getRoom() == null ? "-" : showtime.getRoom().getName())
        .startTime(showtime.getStartTime())
        .capacity(capacity)
        .ticketsSold(sold)
        .occupancyRate(toRate(sold, capacity))
        .build();
  }

  private Long resolveScopedBranchId(User user, Long requestedBranchId) {
    if (user.getRole() == UserRole.ADMIN) {
      return requestedBranchId;
    }
    if (user.getRole() == UserRole.MANAGER) {
      if (user.getBranchId() == null) {
        throw new AccessDeniedException("Manager is not assigned to a branch");
      }
      if (requestedBranchId != null && !Objects.equals(user.getBranchId(), requestedBranchId)) {
        throw new AccessDeniedException("Branch access denied");
      }
      return user.getBranchId();
    }
    throw new AccessDeniedException("Operations report access denied");
  }

  private String getBranchName(Long branchId) {
    if (branchId == null) {
      return "Tat ca chi nhanh";
    }
    return branchRepository.findById(branchId).map(branch -> branch.getName()).orElse(null);
  }

  private LocalDateTime getPaymentDate(Booking booking) {
    if (booking.getPayment().getPaidAt() != null) {
      return booking.getPayment().getPaidAt();
    }
    if (booking.getUpdatedAt() != null) {
      return booking.getUpdatedAt();
    }
    return Objects.requireNonNullElseGet(booking.getCreatedAt(), () -> LocalDateTime.now(clock));
  }

  private BigDecimal sumBookingRevenue(List<Booking> bookings) {
    return bookings.stream()
        .map(Booking::getTotalAmount)
        .map(this::safeAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
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
        .map(bookingFood -> safeAmount(bookingFood.getSubtotal()))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
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

  private BigDecimal safeAmount(BigDecimal amount) {
    return amount == null ? BigDecimal.ZERO : amount;
  }

  private double toRate(long numerator, long denominator) {
    if (denominator <= 0) {
      return 0;
    }
    return Math.round((numerator * 1000.0) / denominator) / 10.0;
  }

  private User getCurrentUser() {
    return userRepository
        .findByUsername(SecurityContextHolder.getContext().getAuthentication().getName())
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }
}
