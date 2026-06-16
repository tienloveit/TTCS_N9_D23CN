package com.ltweb.backend.service;

import com.ltweb.backend.dto.response.AdminAnalyticsResponse;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {
    private static final int DEFAULT_DAYS = 30;
    private static final int RECENT_BOOKING_LIMIT = 6;
    private static final int TOP_LIMIT = 5;
    private static final DateTimeFormatter LABEL_FORMATTER = DateTimeFormatter.ofPattern("dd/MM");

    private final BookingRepository bookingRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final BookingMapper bookingMapper;

    @Transactional(readOnly = true)
    public AdminAnalyticsResponse getDashboard(LocalDate fromDate, LocalDate toDate) {
        LocalDate rangeTo = toDate == null ? LocalDate.now() : toDate;
        LocalDate rangeFrom = fromDate == null ? rangeTo.minusDays(DEFAULT_DAYS - 1L) : fromDate;
        if (rangeFrom.isAfter(rangeTo)) {
            LocalDate temp = rangeFrom;
            rangeFrom = rangeTo;
            rangeTo = temp;
        }

        LocalDateTime startInclusive = rangeFrom.atStartOfDay();
        LocalDateTime endExclusive = rangeTo.plusDays(1).atStartOfDay();

        User currentUser = getCurrentUser();
        Long scopedBranchId = currentUser.getRole() == UserRole.MANAGER ? requireManagedBranch(currentUser) : null;
        List<Booking> bookings = bookingRepository.findAll().stream()
                .filter(booking -> scopedBranchId == null || isBookingInBranch(booking, scopedBranchId))
                .toList();
        List<Showtime> showtimes = showtimeRepository.findAll().stream()
                .filter(showtime -> scopedBranchId == null || isShowtimeInBranch(showtime, scopedBranchId))
                .toList();
        List<Booking> paidBookings = bookings.stream().filter(this::isPaidBooking).toList();
        List<Booking> paidBookingsByPaymentDate = paidBookings.stream()
                .filter(booking -> isInRange(getPaymentDate(booking), startInclusive, endExclusive))
                .toList();
        List<Booking> paidBookingsByShowtimeDate = paidBookings.stream()
                .filter(
                        booking -> booking.getShowtime() != null
                                && isInRange(
                                        booking.getShowtime().getStartTime(), startInclusive, endExclusive))
                .toList();
        List<Showtime> showtimesInRange = showtimes.stream()
                .filter(showtime -> isInRange(showtime.getStartTime(), startInclusive, endExclusive))
                .toList();

        BigDecimal ticketRevenue = sumTicketRevenue(paidBookingsByPaymentDate);
        BigDecimal foodRevenue = sumFoodRevenue(paidBookingsByPaymentDate);
        BigDecimal revenue = sumBookingRevenue(paidBookingsByPaymentDate);
        long ticketsSold = countTickets(paidBookingsByPaymentDate);
        long totalCapacity = showtimesInRange.stream().mapToLong(this::getShowtimeCapacity).sum();
        long occupiedSeats = countTickets(paidBookingsByShowtimeDate);

        List<BookingResponse> recentBookings = bookings.stream()
                .sorted(
                        Comparator.comparing(
                                Booking::getCreatedAt,
                                Comparator.nullsLast(Comparator.naturalOrder()))
                                .reversed())
                .limit(RECENT_BOOKING_LIMIT)
                .map(bookingMapper::toBookingResponse)
                .toList();

        return AdminAnalyticsResponse.builder()
                .fromDate(rangeFrom)
                .toDate(rangeTo)
                .summary(
                        AdminAnalyticsResponse.Summary.builder()
                                .revenue(revenue)
                                .ticketRevenue(ticketRevenue)
                                .foodRevenue(foodRevenue)
                                .paidBookings(paidBookingsByPaymentDate.size())
                                .ticketsSold(ticketsSold)
                                .totalCapacity(totalCapacity)
                                .occupancyRate(toRate(occupiedSeats, totalCapacity))
                                .averageOrderValue(average(revenue, paidBookingsByPaymentDate.size()))
                                .build())
                .revenueTrend(buildRevenueTrend(rangeFrom, rangeTo, paidBookingsByPaymentDate))
                .topMovies(buildTopMovies(showtimesInRange, paidBookingsByShowtimeDate))
                .foodSales(buildFoodSales(paidBookingsByPaymentDate))
                .occupancyByBranch(buildOccupancyByBranch(showtimesInRange, paidBookingsByShowtimeDate))
                .recentBookings(recentBookings)
                .build();
    }

    private List<AdminAnalyticsResponse.DailyRevenue> buildRevenueTrend(
            LocalDate rangeFrom, LocalDate rangeTo, List<Booking> paidBookings) {
        List<AdminAnalyticsResponse.DailyRevenue> trend = new ArrayList<>();
        for (LocalDate date = rangeFrom; !date.isAfter(rangeTo); date = date.plusDays(1)) {
            LocalDate currentDate = date;
            List<Booking> dayBookings = paidBookings.stream()
                    .filter(booking -> currentDate.equals(getPaymentDate(booking).toLocalDate()))
                    .toList();

            trend.add(
                    AdminAnalyticsResponse.DailyRevenue.builder()
                            .date(currentDate)
                            .label(currentDate.format(LABEL_FORMATTER))
                            .revenue(sumBookingRevenue(dayBookings))
                            .bookings(dayBookings.size())
                            .tickets(countTickets(dayBookings))
                            .build());
        }
        return trend;
    }

    private List<AdminAnalyticsResponse.TopMovie> buildTopMovies(
            List<Showtime> showtimes, List<Booking> paidBookings) {
        Map<Long, MovieAccumulator> movies = new HashMap<>();

        for (Showtime showtime : showtimes) {
            if (showtime.getMovie() == null) {
                continue;
            }
            MovieAccumulator accumulator = movies.computeIfAbsent(
                    showtime.getMovie().getId(),
                    movieId -> new MovieAccumulator(movieId, showtime.getMovie().getMovieName()));
            accumulator.capacity += getShowtimeCapacity(showtime);
            accumulator.showtimes++;
        }

        for (Booking booking : paidBookings) {
            if (booking.getShowtime() == null || booking.getShowtime().getMovie() == null) {
                continue;
            }
            Long movieId = booking.getShowtime().getMovie().getId();
            MovieAccumulator accumulator = movies.computeIfAbsent(
                    movieId,
                    id -> new MovieAccumulator(id, booking.getShowtime().getMovie().getMovieName()));
            accumulator.revenue = accumulator.revenue.add(safeAmount(booking.getTotalAmount()));
            accumulator.ticketsSold += getTicketCount(booking);
        }

        return movies.values().stream()
                .sorted(
                        Comparator.comparing((MovieAccumulator movie) -> movie.revenue)
                                .thenComparingLong(movie -> movie.ticketsSold)
                                .reversed())
                .limit(TOP_LIMIT)
                .map(
                        movie -> AdminAnalyticsResponse.TopMovie.builder()
                                .movieId(movie.movieId)
                                .movieName(movie.movieName)
                                .revenue(movie.revenue)
                                .ticketsSold(movie.ticketsSold)
                                .showtimes(movie.showtimes)
                                .capacity(movie.capacity)
                                .occupancyRate(toRate(movie.ticketsSold, movie.capacity))
                                .build())
                .toList();
    }

    private List<AdminAnalyticsResponse.FoodSale> buildFoodSales(List<Booking> paidBookings) {
        Map<Long, FoodAccumulator> foods = new HashMap<>();

        for (Booking booking : paidBookings) {
            for (BookingFood bookingFood : getBookingFoods(booking)) {
                if (bookingFood.getFood() == null) {
                    continue;
                }
                Long foodId = bookingFood.getFood().getId();
                FoodAccumulator accumulator = foods.computeIfAbsent(
                        foodId, id -> new FoodAccumulator(id, bookingFood.getFood().getName()));
                accumulator.quantity += bookingFood.getQuantity() == null ? 0 : bookingFood.getQuantity();
                accumulator.revenue = accumulator.revenue.add(safeAmount(bookingFood.getSubtotal()));
            }
        }

        return foods.values().stream()
                .sorted(
                        Comparator.comparing((FoodAccumulator food) -> food.revenue)
                                .thenComparingLong(food -> food.quantity)
                                .reversed())
                .limit(TOP_LIMIT)
                .map(
                        food -> AdminAnalyticsResponse.FoodSale.builder()
                                .foodId(food.foodId)
                                .foodName(food.foodName)
                                .quantity(food.quantity)
                                .revenue(food.revenue)
                                .build())
                .toList();
    }

    private List<AdminAnalyticsResponse.Occupancy> buildOccupancyByBranch(
            List<Showtime> showtimes, List<Booking> paidBookings) {
        Map<Long, OccupancyAccumulator> branches = new HashMap<>();

        for (Showtime showtime : showtimes) {
            if (showtime.getRoom() == null || showtime.getRoom().getBranch() == null) {
                continue;
            }
            Long branchId = showtime.getRoom().getBranch().getBranchId();
            OccupancyAccumulator accumulator = branches.computeIfAbsent(
                    branchId,
                    id -> new OccupancyAccumulator(id, showtime.getRoom().getBranch().getName()));
            accumulator.capacity += getShowtimeCapacity(showtime);
        }

        for (Booking booking : paidBookings) {
            if (booking.getShowtime() == null
                    || booking.getShowtime().getRoom() == null
                    || booking.getShowtime().getRoom().getBranch() == null) {
                continue;
            }
            Long branchId = booking.getShowtime().getRoom().getBranch().getBranchId();
            OccupancyAccumulator accumulator = branches.computeIfAbsent(
                    branchId,
                    id -> new OccupancyAccumulator(
                            id, booking.getShowtime().getRoom().getBranch().getName()));
            accumulator.ticketsSold += getTicketCount(booking);
        }

        return branches.values().stream()
                .sorted(
                        Comparator.comparingDouble(
                                (OccupancyAccumulator branch) -> toRate(branch.ticketsSold, branch.capacity))
                                .reversed())
                .map(
                        branch -> AdminAnalyticsResponse.Occupancy.builder()
                                .branchId(branch.branchId)
                                .branchName(branch.branchName)
                                .ticketsSold(branch.ticketsSold)
                                .capacity(branch.capacity)
                                .occupancyRate(toRate(branch.ticketsSold, branch.capacity))
                                .build())
                .toList();
    }

    private boolean isPaidBooking(Booking booking) {
        return booking.getStatus() == BookingStatus.COMPLETED
                || booking.getPaymentStatus() == PaymentStatus.PAID;
    }

    private boolean isBookingInBranch(Booking booking, Long branchId) {
        return booking.getShowtime() != null && isShowtimeInBranch(booking.getShowtime(), branchId);
    }

    private boolean isShowtimeInBranch(Showtime showtime, Long branchId) {
        return showtime.getRoom() != null
                && showtime.getRoom().getBranch() != null
                && Objects.equals(showtime.getRoom().getBranch().getBranchId(), branchId);
    }

    private Long requireManagedBranch(User user) {
        if (user.getBranchId() == null) {
            throw new AccessDeniedException("Manager is not assigned to a branch");
        }
        return user.getBranchId();
    }

    private User getCurrentUser() {
        return userRepository
                .findByUsername(SecurityContextHolder.getContext().getAuthentication().getName())
                .orElseThrow(() -> new com.ltweb.backend.exception.AppException(
                        com.ltweb.backend.exception.ErrorCode.USER_NOT_FOUND));
    }

    private LocalDateTime getPaymentDate(Booking booking) {
        if (booking.getPaidAt() != null) {
            return booking.getPaidAt();
        }
        if (booking.getUpdatedAt() != null) {
            return booking.getUpdatedAt();
        }
        return Objects.requireNonNullElseGet(booking.getCreatedAt(), LocalDateTime::now);
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

    private BigDecimal average(BigDecimal total, long count) {
        if (count <= 0) {
            return BigDecimal.ZERO;
        }
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

    private long getShowtimeCapacity(Showtime showtime) {
        if (showtime.getRoom() == null || showtime.getRoom().getSeatCapacity() == null) {
            return 0;
        }
        return Math.max(showtime.getRoom().getSeatCapacity(), 0);
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

    private static class MovieAccumulator {
        private final Long movieId;
        private final String movieName;
        private BigDecimal revenue = BigDecimal.ZERO;
        private long ticketsSold;
        private long showtimes;
        private long capacity;

        private MovieAccumulator(Long movieId, String movieName) {
            this.movieId = movieId;
            this.movieName = movieName;
        }
    }

    private static class FoodAccumulator {
        private final Long foodId;
        private final String foodName;
        private BigDecimal revenue = BigDecimal.ZERO;
        private long quantity;

        private FoodAccumulator(Long foodId, String foodName) {
            this.foodId = foodId;
            this.foodName = foodName;
        }
    }

    private static class OccupancyAccumulator {
        private final Long branchId;
        private final String branchName;
        private long ticketsSold;
        private long capacity;

        private OccupancyAccumulator(Long branchId, String branchName) {
            this.branchId = branchId;
            this.branchName = branchName;
        }
    }
}
