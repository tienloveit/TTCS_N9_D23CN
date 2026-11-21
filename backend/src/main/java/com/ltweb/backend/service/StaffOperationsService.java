package com.ltweb.backend.service;

import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.dto.response.StaffDashboardResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StaffOperationsService {
  private final java.time.Clock clock;
  private static final int DASHBOARD_LIMIT = 6;

  private final BookingRepository bookingRepository;
  private final ShowtimeRepository showtimeRepository;
  private final TicketRepository ticketRepository;
  private final UserRepository userRepository;
  private final BookingMapper bookingMapper;

  @Transactional(readOnly = true)
  public StaffDashboardResponse getDashboard() {
    User staff = getCurrentUser();
    Long branchId = requireBranchOperatorBranch(staff);
    LocalDate today = LocalDate.now(clock);
    LocalDateTime startOfDay = today.atStartOfDay();
    LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();
    LocalDateTime now = LocalDateTime.now(clock);

    List<Booking> staffBookingsToday =
        bookingRepository.findStaffBookingsByBusinessDate(
            staff.getId(), branchId, startOfDay, endOfDay);
    List<Booking> paidStaffBookingsToday =
        staffBookingsToday.stream().filter(this::isPaidBooking).toList();

    BigDecimal revenue = sumBookingRevenue(paidStaffBookingsToday);
    BigDecimal cashRevenue = sumRevenueByMethod(paidStaffBookingsToday, PaymentMethod.CASH);
    BigDecimal cardRevenue =
        sumRevenueByMethod(paidStaffBookingsToday, PaymentMethod.CARD)
            .add(sumRevenueByMethod(paidStaffBookingsToday, PaymentMethod.VNPAY));
    BigDecimal foodRevenue = sumFoodRevenue(paidStaffBookingsToday);

    // Két tiền mặt: thu gộp theo ngày thanh toán, trừ tiền trả lại theo ngày hoàn. Đơn bán rồi hoàn
    // trong cùng ngày được tính cả hai phía nên két vẫn khớp.
    List<Booking> myCashBookings =
        bookingRepository.findStaffCashMovements(staff.getId(), branchId, startOfDay, endOfDay);
    List<Booking> cashSalesToday =
        myCashBookings.stream()
            .filter(booking -> isInRange(booking.getPayment().getPaidAt(), startOfDay, endOfDay))
            .toList();
    List<Booking> cashRefundsToday =
        myCashBookings.stream()
            .filter(booking -> booking.getPayment().getPaymentStatus() == PaymentStatus.REFUNDED)
            .filter(
                booking -> isInRange(booking.getPayment().getRefundedAt(), startOfDay, endOfDay))
            .toList();
    BigDecimal cashCollected = sumBookingRevenue(cashSalesToday);
    BigDecimal cashRefunded =
        cashRefundsToday.stream()
            .map(
                booking ->
                    booking.getPayment().getRefundAmount() != null
                        ? booking.getPayment().getRefundAmount()
                        : booking.getTotalAmount())
            .map(this::safeAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    long ticketsSold = paidStaffBookingsToday.stream().mapToLong(this::ticketCount).sum();
    long pendingBookings =
        staffBookingsToday.stream()
            .filter(booking -> booking.getStatus() == BookingStatus.PENDING)
            .count();
    long checkedInTickets = ticketRepository.countCheckedInBetween(branchId, startOfDay, endOfDay);
    long refundRequests =
        bookingRepository.countByStatusInBranch(BookingStatus.REFUND_REQUESTED, branchId);

    List<StaffDashboardResponse.UpcomingShowtime> upcomingShowtimes =
        showtimeRepository.findUpcoming(branchId, now, PageRequest.of(0, DASHBOARD_LIMIT)).stream()
            .map(this::toUpcomingShowtime)
            .toList();

    List<BookingResponse> recentBookings =
        bookingRepository.findRecent(branchId, staff.getId(), DASHBOARD_LIMIT).stream()
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
                .cashCollected(cashCollected)
                .cashSales(cashSalesToday.size())
                .cashRefunded(cashRefunded)
                .cashRefunds(cashRefundsToday.size())
                .cashExpected(cashCollected.subtract(cashRefunded))
                .build())
        .upcomingShowtimes(upcomingShowtimes)
        .recentBookings(recentBookings)
        .build();
  }

  private StaffDashboardResponse.UpcomingShowtime toUpcomingShowtime(Showtime showtime) {
    int totalSeats = ticketRepository.countByShowtimeId(showtime.getId());
    int availableSeats =
        ticketRepository.countByShowtimeIdAndTicketStatus(showtime.getId(), TicketStatus.AVAILABLE);
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
        || booking.getPayment().getPaymentStatus() == PaymentStatus.PAID;
  }

  private boolean isInRange(
      LocalDateTime value, LocalDateTime startInclusive, LocalDateTime endExclusive) {
    return value != null && !value.isBefore(startInclusive) && value.isBefore(endExclusive);
  }

  private BigDecimal sumBookingRevenue(List<Booking> bookings) {
    return bookings.stream()
        .map(Booking::getTotalAmount)
        .map(this::safeAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal sumRevenueByMethod(List<Booking> bookings, PaymentMethod method) {
    return bookings.stream()
        .filter(booking -> booking.getPayment().getPaymentMethod() == method)
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
}
