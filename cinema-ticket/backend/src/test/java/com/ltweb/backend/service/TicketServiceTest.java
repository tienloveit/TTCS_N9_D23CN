package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ltweb.backend.dto.request.CheckInTicketRequest;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.TicketMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.SeatRepository;
import com.ltweb.backend.repository.SeatTypePriceRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {
  @Mock private TicketRepository ticketRepository;
  @Mock private BookingRepository bookingRepository;
  @Mock private ShowtimeRepository showtimeRepository;
  @Mock private SeatRepository seatRepository;
  @Mock private SeatTypePriceRepository seatTypePriceRepository;
  @Mock private UserRepository userRepository;
  @Mock private StringRedisTemplate redisTemplate;
  @Mock private TicketMapper ticketMapper;
  @Mock private QRCodeReaderService qrCodeReaderService;
  @Mock private AuditLogService auditLogService;

  @InjectMocks private TicketService ticketService;

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void checkIn_marksPaidTicketAsCheckedIn() {
    authenticate("staff");
    User staff = User.builder().id(7L).username("staff").role(UserRole.STAFF).branchId(1L).build();
    Ticket ticket = paidTicketInBranch(1L);
    when(userRepository.findByUsername("staff")).thenReturn(Optional.of(staff));
    when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));

    CheckInTicketRequest request = new CheckInTicketRequest();
    request.setCode("10");
    var response = ticketService.checkIn(request);

    assertThat(ticket.getCheckedInAt()).isNotNull();
    assertThat(response.getBookingCode()).isEqualTo("BK-TEST");
    verify(ticketRepository).save(ticket);
    verify(auditLogService).record(any(), any(), any(), any());
  }

  @Test
  void checkIn_rejectsUnpaidTicket() {
    authenticate("staff");
    User staff = User.builder().id(7L).username("staff").role(UserRole.STAFF).branchId(1L).build();
    Ticket ticket = paidTicketInBranch(1L);
    ticket.getBooking().setPaymentStatus(PaymentStatus.PENDING);
    when(userRepository.findByUsername("staff")).thenReturn(Optional.of(staff));
    when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));

    CheckInTicketRequest request = new CheckInTicketRequest();
    request.setCode("10");

    assertThatThrownBy(() -> ticketService.checkIn(request))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.INVALID_TICKET_CHECKIN);
  }

  private void authenticate(String username) {
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(username, "n/a"));
  }

  private Ticket paidTicketInBranch(Long branchId) {
    Branch branch = Branch.builder().branchId(branchId).name("Branch").build();
    Room room = Room.builder().id(2L).name("Room 1").branch(branch).build();
    Showtime showtime = Showtime.builder().id(3L).room(room).build();
    Seat seat = Seat.builder().id(4L).seatCode("A1").build();
    Booking booking =
        Booking.builder()
            .id(5L)
            .bookingCode("BK-TEST")
            .showtime(showtime)
            .status(BookingStatus.COMPLETED)
            .paymentStatus(PaymentStatus.PAID)
            .build();
    Ticket ticket =
        Ticket.builder()
            .id(10L)
            .booking(booking)
            .showtime(showtime)
            .seat(seat)
            .ticketStatus(TicketStatus.BOOKED)
            .build();
    booking.setTickets(List.of(ticket));
    return ticket;
  }
}
