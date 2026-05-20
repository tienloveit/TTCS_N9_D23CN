package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CloseStaffShiftRequest;
import com.ltweb.backend.dto.request.OpenStaffShiftRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.dto.response.StaffDashboardResponse;
import com.ltweb.backend.dto.response.StaffShiftResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.StaffShift;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.StaffShiftStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.StaffShiftRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StaffOperationsService {
  private static final int DASHBOARD_LIMIT = 6;

  private final BookingRepository bookingRepository;
  private final ShowtimeRepository showtimeRepository;
  private final TicketRepository ticketRepository;
  private final StaffShiftRepository staffShiftRepository;
  private final UserRepository userRepository;
  private final BookingMapper bookingMapper;

  @Transactional(readOnly = true)
  public StaffDashboardResponse getDashboard() {
    User staff = getCurrentUser();
    Long branchId = requireBranchOperatorBranch(staff);
    LocalDate today = LocalDate.now();
    LocalDateTime startOfDay = today.atStartOfDay();
    LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();
    LocalDateTime now = LocalDateTime.now();
    StaffShift activeShift =
        staffShiftRepository
            .findFirstByStaffIdAndStatusOrderByOpenedAtDesc(staff.getId(), StaffShiftStatus.OPEN)
            .orElse(null);
    LocalDateTime salesStart = activeShift == null ? startOfDay : activeShift.getOpenedAt();
    LocalDateTime salesEnd = activeShift == null ? endOfDay : now;

    List<Booking> branchBookings =
        bookingRepository.findAll().stream()
            .filter(booking -> branchId == null || isBookingInBranch(booking, branchId))
            .toList();
    List<Booking> staffBookingsToday =
        branchBookings.stream()
            .filter(booking -> isStaffBooking(booking, staff))
            .filter(booking -> isInRange(getBusinessDate(booking), salesStart, salesEnd))
            .toList();
    List<Booking> paidStaffBookingsToday =
        staffBookingsToday.stream().filter(this::isPaidBooking).toList();

    BigDecimal revenue = sumBookingRevenue(paidStaffBookingsToday);
    BigDecimal cashRevenue = sumRevenueByMethod(paidStaffBookingsToday, PaymentMethod.CASH);
    BigDecimal cardRevenue = sumRevenueByMethod(paidStaffBookingsToday, PaymentMethod.CARD);
    BigDecimal foodRevenue = sumFoodRevenue(paidStaffBookingsToday);
    long ticketsSold = paidStaffBookingsToday.stream().mapToLong(this::ticketCount).sum();
    long pendingBookings =
        staffBookingsToday.stream().filter(booking -> booking.getStatus() == BookingStatus.PENDING).count();
    long checkedInTickets =
        branchBookings.stream()
            .flatMap(booking -> getTickets(booking).stream())
            .filter(ticket -> isInRange(ticket.getCheckedInAt(), startOfDay, endOfDay))
            .count();
    long refundRequests =
        branchBookings.stream()
            .filter(booking -> booking.getStatus() == BookingStatus.REFUND_REQUESTED)
            .count();

    List<StaffDashboardResponse.UpcomingShowtime> upcomingShowtimes =
        showtimeRepository.findAll().stream()
            .filter(showtime -> branchId == null || isShowtimeInBranch(showtime, branchId))
            .filter(showtime -> showtime.getStartTime() != null && !showtime.getStartTime().isBefore(now))
            .sorted(Comparator.comparing(Showtime::getStartTime))
            .limit(DASHBOARD_LIMIT)
            .map(this::toUpcomingShowtime)
            .toList();

    List<BookingResponse> recentBookings =
        branchBookings.stream()
            .filter(booking -> isStaffBooking(booking, staff))
            .sorted(
                Comparator.comparing(
                        Booking::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                    .reversed())
            .limit(DASHBOARD_LIMIT)
            .map(bookingMapper::toBookingResponse)
            .toList();

    return StaffDashboardResponse.builder()
        .summary(
            StaffDashboardResponse.Summary.builder()
                .revenue(revenue)
                .cashRevenue(cashRevenue)
                .cardRevenue(cardRevenue)
                .foodRevenue(foodRevenue)
                .paidBookings(paidStaffBookingsToday.size())
                .pendingBookings(pendingBookings)
                .ticketsSold(ticketsSold)
                .checkedInTickets(checkedInTickets)
                .refundRequests(refundRequests)
                .build())
        .activeShift(activeShift == null ? null : toShiftResponse(activeShift, calculateExpectedCash(activeShift)))
        .upcomingShowtimes(upcomingShowtimes)
        .recentBookings(recentBookings)
        .build();
  }

  @Transactional(readOnly = true)
  public StaffShiftResponse getActiveShiftForCurrentUser() {
    User staff = getCurrentUser();
    return staffShiftRepository
        .findFirstByStaffIdAndStatusOrderByOpenedAtDesc(staff.getId(), StaffShiftStatus.OPEN)
        .map(shift -> toShiftResponse(shift, calculateExpectedCash(shift)))
        .orElse(null);
  }

  @Transactional(readOnly = true)
  public List<StaffShiftResponse> getShiftHistoryForCurrentUser() {
    User staff = getCurrentUser();
    return staffShiftRepository.findByStaffIdOrderByOpenedAtDesc(staff.getId()).stream()
        .map(shift -> toShiftResponse(shift, calculateShiftMetrics(shift)))
        .toList();
  }

  @Transactional
  public StaffShiftResponse openShift(OpenStaffShiftRequest request) {
    User staff = getCurrentUser();
    Long branchId = requireBranchOperatorBranch(staff);
    staffShiftRepository
        .findFirstByStaffIdAndStatusOrderByOpenedAtDesc(staff.getId(), StaffShiftStatus.OPEN)
        .ifPresent(
            shift -> {
              throw new AppException(ErrorCode.VALIDATION_ERROR);
            });

    StaffShift shift =
        StaffShift.builder()
            .staff(staff)
            .branchId(branchId)
            .openingCash(safeAmount(request.getOpeningCash()))
            .expectedCash(safeAmount(request.getOpeningCash()))
            .openedAt(LocalDateTime.now())
            .note(request.getNote())
            .status(StaffShiftStatus.OPEN)
            .build();
    StaffShift saved = staffShiftRepository.save(shift);
    return toShiftResponse(saved, calculateShiftMetrics(saved));
  }

  @Transactional
  public StaffShiftResponse closeShift(CloseStaffShiftRequest request) {
    User staff = getCurrentUser();
    StaffShift shift =
        staffShiftRepository
            .findFirstByStaffIdAndStatusOrderByOpenedAtDesc(staff.getId(), StaffShiftStatus.OPEN)
            .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR));
    ShiftMetrics metrics = calculateShiftMetrics(shift);
    BigDecimal expectedCash = metrics.expectedCash();
    BigDecimal closingCash = safeAmount(request.getClosingCash());

    shift.setExpectedCash(expectedCash);
    shift.setClosingCash(closingCash);
    shift.setCashDifference(closingCash.subtract(expectedCash));
    shift.setClosedAt(LocalDateTime.now());
    shift.setNote(request.getNote());
    shift.setStatus(StaffShiftStatus.CLOSED);
    StaffShift saved = staffShiftRepository.save(shift);
    return toShiftResponse(saved, calculateShiftMetrics(saved));
  }

  private StaffDashboardResponse.UpcomingShowtime toUpcomingShowtime(Showtime showtime) {
    int totalSeats = ticketRepository.countByShowtimeId(showtime.getId());
    int availableSeats = ticketRepository.countByShowtimeIdAndTicketStatus(
        showtime.getId(), TicketStatus.AVAILABLE);
    return StaffDashboardResponse.UpcomingShowtime.builder()
        .showtimeId(showtime.getId())
        .movieName(showtime.getMovie() == null ? null : showtime.getMovie().getMovieName())
        .roomName(showtime.getRoom() == null ? null : showtime.getRoom().getName())
        .branchName(
            showtime.getRoom() == null || showtime.getRoom().getBranch() == null
                ? null
                : showtime.getRoom().getBranch().getName())
        .startTime(showtime.getStartTime())
        .endTime(showtime.getEndTime())
        .availableSeats(availableSeats)
        .totalSeats(totalSeats)
        .build();
  }

  private StaffShiftResponse toShiftResponse(StaffShift shift, BigDecimal expectedCash) {
    return toShiftResponse(shift, calculateShiftMetrics(shift));
  }

  @Transactional(readOnly = true)
  public StaffShiftResponse toShiftResponseForHistory(StaffShift shift) {
    return toShiftResponse(shift, calculateShiftMetrics(shift));
  }

  private StaffShiftResponse toShiftResponse(StaffShift shift, ShiftMetrics metrics) {
    User staff = shift.getStaff();
    return StaffShiftResponse.builder()
        .shiftId(shift.getId())
        .staffId(staff == null ? null : staff.getId())
        .staffUsername(staff == null ? null : staff.getUsername())
        .branchId(shift.getBranchId())
        .openingCash(safeAmount(shift.getOpeningCash()))
        .closingCash(shift.getClosingCash())
        .cashSales(metrics.cashSales())
        .cardSales(metrics.cardSales())
        .totalSales(metrics.totalSales())
        .expectedCash(metrics.expectedCash())
        .cashDifference(shift.getCashDifference())
        .paidBookings(metrics.paidBookings())
        .ticketsSold(metrics.ticketsSold())
        .openedAt(shift.getOpenedAt())
        .closedAt(shift.getClosedAt())
        .durationMinutes(getDurationMinutes(shift))
        .note(shift.getNote())
        .status(shift.getStatus())
        .build();
  }

  private BigDecimal calculateExpectedCash(StaffShift shift) {
    return calculateShiftMetrics(shift).expectedCash();
  }

  private ShiftMetrics calculateShiftMetrics(StaffShift shift) {
    LocalDateTime from = shift.getOpenedAt();
    LocalDateTime to =
        shift.getClosedAt() == null ? LocalDateTime.now() : shift.getClosedAt();
    List<Booking> allPaidBookings =
        bookingRepository.findAll().stream()
            .filter(booking -> isStaffBooking(booking, shift.getStaff()))
            .filter(booking -> Objects.equals(getBookingBranchId(booking), shift.getBranchId()))
            .filter(this::isPaidBooking)
            .filter(booking -> isInRange(getBusinessDate(booking), from, to))
            .toList();
    BigDecimal cashSales = sumRevenueByMethod(allPaidBookings, PaymentMethod.CASH);
    BigDecimal cardSales = sumRevenueByMethod(allPaidBookings, PaymentMethod.CARD)
        .add(sumRevenueByMethod(allPaidBookings, PaymentMethod.VNPAY));
    BigDecimal totalSales = sumBookingRevenue(allPaidBookings);
    long ticketsSold = allPaidBookings.stream().mapToLong(this::ticketCount).sum();
    return new ShiftMetrics(
        cashSales,
        cardSales,
        totalSales,
        safeAmount(shift.getOpeningCash()).add(cashSales),
        allPaidBookings.size(),
        ticketsSold);
  }

  private Long getDurationMinutes(StaffShift shift) {
    if (shift.getOpenedAt() == null) {
      return null;
    }
    LocalDateTime end = shift.getClosedAt() == null ? LocalDateTime.now() : shift.getClosedAt();
    return Math.max(Duration.between(shift.getOpenedAt(), end).toMinutes(), 0);
  }

  private Long requireBranchOperatorBranch(User user) {
    if (user.getRole() == UserRole.ADMIN) {
      return user.getBranchId();
    }
    if ((user.getRole() == UserRole.STAFF || user.getRole() == UserRole.MANAGER)
        && user.getBranchId() != null) {
      return user.getBranchId();
    }
    throw new AccessDeniedException("Staff is not assigned to a branch");
  }

  private User getCurrentUser() {
    return userRepository
        .findByUsername(SecurityContextHolder.getContext().getAuthentication().getName())
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }

  private boolean isPaidBooking(Booking booking) {
    return booking.getStatus() == BookingStatus.COMPLETED
        || booking.getPaymentStatus() == PaymentStatus.PAID;
  }

  private boolean isStaffBooking(Booking booking, User staff) {
    return booking.getStaffUser() != null
        && staff != null
        && Objects.equals(booking.getStaffUser().getId(), staff.getId());
  }

  private boolean isBookingInBranch(Booking booking, Long branchId) {
    return Objects.equals(getBookingBranchId(booking), branchId);
  }

  private Long getBookingBranchId(Booking booking) {
    if (booking.getShowtime() == null
        || booking.getShowtime().getRoom() == null
        || booking.getShowtime().getRoom().getBranch() == null) {
      return null;
    }
    return booking.getShowtime().getRoom().getBranch().getBranchId();
  }

  private boolean isShowtimeInBranch(Showtime showtime, Long branchId) {
    return showtime.getRoom() != null
        && showtime.getRoom().getBranch() != null
        && Objects.equals(showtime.getRoom().getBranch().getBranchId(), branchId);
  }

  private boolean isInRange(LocalDateTime value, LocalDateTime startInclusive, LocalDateTime endExclusive) {
    return value != null && !value.isBefore(startInclusive) && value.isBefore(endExclusive);
  }

  private LocalDateTime getBusinessDate(Booking booking) {
    if (booking.getPaidAt() != null) {
      return booking.getPaidAt();
    }
    if (booking.getCreatedAt() != null) {
      return booking.getCreatedAt();
    }
    return LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
  }

  private BigDecimal sumBookingRevenue(List<Booking> bookings) {
    return bookings.stream()
        .map(Booking::getTotalAmount)
        .map(this::safeAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal sumRevenueByMethod(List<Booking> bookings, PaymentMethod method) {
    return bookings.stream()
        .filter(booking -> booking.getPaymentMethod() == method)
        .map(Booking::getTotalAmount)
        .map(this::safeAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal sumFoodRevenue(List<Booking> bookings) {
    return bookings.stream()
        .flatMap(booking -> getBookingFoods(booking).stream())
        .map(BookingFood::getSubtotal)
        .map(this::safeAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private long ticketCount(Booking booking) {
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

  private record ShiftMetrics(
      BigDecimal cashSales,
      BigDecimal cardSales,
      BigDecimal totalSales,
      BigDecimal expectedCash,
      long paidBookings,
      long ticketsSold) {}
}
