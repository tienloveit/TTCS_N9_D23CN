package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.CreateBookingRequest;
import com.ltweb.backend.dto.request.StaffBookingRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.LongStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

class BookingTicketLimitTest {
    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void sameCustomerCanBuyNineTicketsForOneMovieAcrossSeparateTransactions(boolean atCounter) {
        Fixture fixture = new Fixture(atCounter);
        for (long seatId = 1; seatId <= 9; seatId++) {
            assertThat(fixture.book(List.of(seatId))).isNotNull();
        }
        assertThat(fixture.bookedTickets.get()).isEqualTo(9);
        verify(fixture.bookings, times(9)).save(any(Booking.class));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void aSingleTransactionStillRejectsNineTickets(boolean atCounter) {
        Fixture fixture = new Fixture(atCounter);
        assertThatThrownBy(() -> fixture.book(LongStream.rangeClosed(1, 9).boxed().toList()))
                .isInstanceOfSatisfying(AppException.class,
                        error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.MAX_TICKET_PER_TRANSACTION));
        verify(fixture.bookings, never()).save(any(Booking.class));
    }

    private static class Fixture {
        private final boolean atCounter;
        private final BookingService service;
        private final BookingRepository bookings = mock(BookingRepository.class);
        private final AtomicInteger bookedTickets = new AtomicInteger();

        @SuppressWarnings("unchecked")
        Fixture(boolean atCounter) {
            this.atCounter = atCounter;
            User customer = User.builder().id(1L).username("customer").role(UserRole.USER).build();
            User operator = atCounter
                    ? User.builder().id(2L).username("staff").role(UserRole.STAFF).branchId(1L).build()
                    : customer;
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(operator.getUsername(), "unused"));
            var users = mock(UserRepository.class);
            when(users.findByUsername(operator.getUsername())).thenReturn(Optional.of(operator));
            when(users.findByEmail("customer@example.test")).thenReturn(Optional.of(customer));
            Branch branch = Branch.builder().branchId(1L).status(BranchStatus.ACTIVE).build();
            Room room = Room.builder().id(1L).branch(branch).status(RoomStatus.ACTIVE).build();
            Movie movie = Movie.builder().id(1L).isPublic(true).build();
            Showtime showtime = Showtime.builder().id(1L).room(room).movie(movie)
                    .status(ShowtimeStatus.OPEN).startTime(LocalDateTime.now().plusDays(1)).build();
            var showtimes = mock(ShowtimeRepository.class);
            when(showtimes.findById(1L)).thenReturn(Optional.of(showtime));
            // Model existing purchase history if booking code consults any ticket count query.
            var tickets = mock(TicketRepository.class, invocation ->
                    invocation.getMethod().getName().startsWith("count")
                            ? bookedTickets.get() : RETURNS_DEFAULTS.answer(invocation));
            AtomicReference<List<Ticket>> selected = new AtomicReference<>(List.of());
            when(tickets.findSeatsForUpdate(eq(1L), anyList())).thenAnswer(invocation -> {
                List<Long> ids = invocation.getArgument(1);
                List<Ticket> inventory = ids.stream().map(id -> Ticket.builder().id(id)
                        .seat(Seat.builder().id(id).seatCode("A" + id).build()).showtime(showtime)
                        .price(new BigDecimal("75000")).ticketStatus(TicketStatus.AVAILABLE).build()).toList();
                selected.set(inventory);
                return inventory;
            });
            when(bookings.save(any(Booking.class))).thenAnswer(invocation -> {
                Booking booking = invocation.getArgument(0);
                booking.setId((long) bookedTickets.addAndGet(selected.get().size()));
                return booking;
            });
            var settings = mock(SystemSettingService.class);
            when(settings.getInt(anyString(), anyInt())).thenAnswer(invocation -> invocation.getArgument(1));
            RedisTemplate<String, String> redis = mock(RedisTemplate.class);
            ValueOperations<String, String> values = mock(ValueOperations.class);
            when(redis.opsForValue()).thenReturn(values);
            when(values.setIfAbsent(anyString(), anyString(), anyLong(), any())).thenReturn(true);
            var mapper = mock(BookingMapper.class);
            when(mapper.toBookingResponse(any())).thenAnswer(invocation ->
                    BookingResponse.builder().bookingId(((Booking) invocation.getArgument(0)).getId()).build());
            service = new BookingService(bookings, showtimes, tickets, mock(FoodRepository.class), users,
                    redis, mock(SimpMessagingTemplate.class), mapper, mock(PasswordEncoder.class),
                    mock(ApplicationEventPublisher.class), mock(PromotionService.class), mock(AuditLogService.class),
                    settings, mock(NotificationService.class), mock(FoodStockService.class), mock(BookingRefundService.class));
        }

        BookingResponse book(List<Long> seatIds) {
            if (atCounter) {
                StaffBookingRequest request = new StaffBookingRequest();
                request.setShowtimeId(1L);
                request.setSeatIds(seatIds);
                request.setCustomerEmail("customer@example.test");
                return service.createStaffBooking(request);
            }
            CreateBookingRequest request = new CreateBookingRequest();
            request.setShowtimeId(1L);
            request.setSeatIds(seatIds);
            return service.createBooking(request);
        }
    }
}
