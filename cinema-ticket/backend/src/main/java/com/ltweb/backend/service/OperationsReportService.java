package com.ltweb.backend.service;

import com.ltweb.backend.dto.response.OperationsReportResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
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
    private final BookingRepository bookingRepository;
    private final ShowtimeRepository showtimeRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final BranchRepository branchRepository;

    @Transactional(readOnly = true)
    public OperationsReportResponse getDailyReport(LocalDate reportDate, Long requestedBranchId) {
        LocalDate date = reportDate == null ? LocalDate.now() : reportDate;
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        User currentUser = getCurrentUser();
        Long scopedBranchId = resolveScopedBranchId(currentUser, requestedBranchId);

        List<Booking> branchBookings = bookingRepository.findAll().stream()
                .filter(booking -> scopedBranchId == null || isBookingInBranch(booking, scopedBranchId))
                .toList();
        List<Booking> paidToday = branchBookings.stream()
                .filter(this::isPaidBooking)
                .filter(booking -> isInRange(getPaymentDate(booking), start, end))
                .toList();
        List<Booking> pendingToday = branchBookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.PENDING)
                .filter(booking -> isInRange(booking.getCreatedAt(), start, end))
                .toList();
        List<Booking> refundRequests = branchBookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.REFUND_REQUESTED)
                .sorted(Comparator.comparing(this::getPaymentDate).reversed())
                .toList();
        List<Booking> refundedToday = branchBookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.REFUNDED)
                .filter(booking -> isInRange(booking.getPayment().getRefundedAt(), start, end))
                .toList();

        List<Showtime> showtimesToday = showtimeRepository.findAll().stream()
                .filter(showtime -> scopedBranchId == null || isShowtimeInBranch(showtime, scopedBranchId))
                .filter(showtime -> isInRange(showtime.getStartTime(), start, end))
                .toList();
        long capacity = showtimesToday.stream().mapToLong(this::getShowtimeCapacity).sum();
        long ticketsSoldByShowtimeDate = countTicketsForShowtimes(showtimesToday, branchBookings);
        return OperationsReportResponse.builder()
                .reportDate(date)
                .branchId(scopedBranchId)
                .branchName(getBranchName(scopedBranchId))
                .summary(
                        OperationsReportResponse.Summary.builder()
                                .revenue(sumBookingRevenue(paidToday))
                                .ticketRevenue(sumTicketRevenue(paidToday))
                                .foodRevenue(sumFoodRevenue(paidToday))
                                .refundedAmount(sumRefundAmount(refundedToday))
                                .completedBookings(paidToday.size())
                                .pendingBookings(pendingToday.size())
                                .refundRequests(refundRequests.size())
                                .ticketsSold(countTickets(paidToday))
                                .showtimes(showtimesToday.size())
                                .totalCapacity(capacity)
                                .occupancyRate(toRate(ticketsSoldByShowtimeDate, capacity))


                                .build())
                .paymentBreakdown(buildPaymentBreakdown(paidToday))

                .refundQueue(refundRequests.stream().limit(20).map(this::toRefundQueueItem).toList())
                .showtimeLoads(
                        showtimesToday.stream().map(showtime -> toShowtimeLoad(showtime, branchBookings)).toList())
                .build();
    }

    private List<OperationsReportResponse.PaymentBreakdown> buildPaymentBreakdown(List<Booking> bookings) {
        Map<PaymentMethod, List<Booking>> grouped = bookings.stream()
                .collect(Collectors.groupingBy(
                        booking -> booking.getPayment().getPaymentMethod() == null ? PaymentMethod.VNPAY
                                : booking.getPayment().getPaymentMethod()));
        return grouped.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> OperationsReportResponse.PaymentBreakdown.builder()
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

    private OperationsReportResponse.ShowtimeLoad toShowtimeLoad(Showtime showtime, List<Booking> bookings) {
        long capacity = getShowtimeCapacity(showtime);
        long sold = bookings.stream()
                .filter(this::isPaidBooking)
                .filter(
                        booking -> booking.getShowtime() != null
                                && Objects.equals(booking.getShowtime().getId(), showtime.getId()))
                .mapToLong(this::getTicketCount)
                .sum();
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

    private boolean isPaidBooking(Booking booking) {
        return booking.getStatus() == BookingStatus.COMPLETED
                || booking.getPayment().getPaymentStatus() == PaymentStatus.PAID;
    }

    private boolean isBookingInBranch(Booking booking, Long branchId) {
        return booking.getShowtime() != null && isShowtimeInBranch(booking.getShowtime(), branchId);
    }

    private boolean isShowtimeInBranch(Showtime showtime, Long branchId) {
        return showtime.getRoom() != null
                && showtime.getRoom().getBranch() != null
                && Objects.equals(showtime.getRoom().getBranch().getBranchId(), branchId);
    }

    private boolean isInRange(LocalDateTime value, LocalDateTime start, LocalDateTime end) {
        return value != null && !value.isBefore(start) && value.isBefore(end);
    }

    private LocalDateTime getPaymentDate(Booking booking) {
        if (booking.getPayment().getPaidAt() != null) {
            return booking.getPayment().getPaidAt();
        }
        if (booking.getUpdatedAt() != null) {
            return booking.getUpdatedAt();
        }
        return Objects.requireNonNullElseGet(booking.getCreatedAt(), LocalDateTime::now);
    }

    private BigDecimal sumBookingRevenue(List<Booking> bookings) {
        return bookings.stream()
                .map(Booking::getTotalAmount)
                .map(this::safeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumRefundAmount(List<Booking> bookings) {
        return bookings.stream()
                .map(booking -> booking.getPayment().getRefundAmount())
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

    private long countTicketsForShowtimes(List<Showtime> showtimes, List<Booking> bookings) {
        java.util.Set<Long> showtimeIds = showtimes.stream().map(Showtime::getId).collect(Collectors.toSet());
        return bookings.stream()
                .filter(this::isPaidBooking)
                .filter(booking -> booking.getShowtime() != null && showtimeIds.contains(booking.getShowtime().getId()))
                .mapToLong(this::getTicketCount)
                .sum();
    }

    private int getShowtimeCapacity(Showtime showtime) {
        if (showtime == null || showtime.getId() == null) {
            return 0;
        }
        return ticketRepository.countByShowtimeId(showtime.getId());
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
