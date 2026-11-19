package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ltweb.backend.dto.request.CheckInTicketRequest;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Payment;
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
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
  @Mock private UserRepository userRepository;
  @Mock private StringRedisTemplate redisTemplate;
  @Mock private TicketMapper ticketMapper;
  @Mock private QRCodeReaderService qrCodeReaderService;
  @Mock private AuditLogService auditLogService;

  private TicketService ticketService;

  @org.junit.jupiter.api.BeforeEach
  void createService() {
    ticketService =
        BackendServiceFixtures.ticket(
            ticketRepository,
            bookingRepository,
            showtimeRepository,
            seatRepository,
            userRepository,
            redisTemplate,
            ticketMapper,
            qrCodeReaderService,
            auditLogService);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void checkIn_rejectsQrFromPreviousBookingAfterSeatIsResold() {
    Ticket ticket = paidTicketInBranch(1L);
    ticket.setQrCode("CINEMAHUB|BOOKING=BK-NEW|TICKET=10|SEAT=A1");
    when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));
    CheckInTicketRequest request = new CheckInTicketRequest();
    request.setCode("CINEMAHUB|BOOKING=BK-OLD|TICKET=10|SEAT=A1");
    assertThatThrownBy(() -> ticketService.checkIn(request)).isInstanceOf(AppException.class);
    assertThat(ticket.getCheckedInAt()).isNull();
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
    assertThat(ticket.getCheckedInBy()).isSameAs(staff);
    assertThat(response.getTickets().getFirst().getCheckedInBy()).isEqualTo(7L);
    assertThat(response.getBookingCode()).isEqualTo("BK-TEST");
    verify(ticketRepository).save(ticket);
    verify(auditLogService).record(any(), any(), any(), any());
  }

  @Test
  void checkIn_rejectsUnpaidTicket() {
    authenticate("staff");
    User staff = User.builder().id(7L).username("staff").role(UserRole.STAFF).branchId(1L).build();
    Ticket ticket = paidTicketInBranch(1L);
    ticket.getBooking().getPayment().setPaymentStatus(PaymentStatus.PENDING);
    when(userRepository.findByUsername("staff")).thenReturn(Optional.of(staff));
    when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));

    CheckInTicketRequest request = new CheckInTicketRequest();
    request.setCode("10");

    assertThatThrownBy(() -> ticketService.checkIn(request))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.INVALID_TICKET_CHECKIN);
    assertThat(ticket.getCheckedInBy()).isNull();
  }

  @Test
  void repeatCheckInKeepsOriginalStaffAndTime() {
    authenticate("staff");
    User staff = User.builder().id(7L).role(UserRole.STAFF).branchId(1L).build();
    User original = User.builder().id(8L).fullName("Original staff").build();
    Ticket ticket = paidTicketInBranch(1L);
    var originalTime = java.time.LocalDateTime.of(2026, 11, 11, 10, 0);
    ticket.setCheckedInAt(originalTime);
    ticket.setCheckedInBy(original);
    when(userRepository.findByUsername("staff")).thenReturn(Optional.of(staff));
    when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));
    var request = new CheckInTicketRequest();
    request.setCode("10");
    var response = ticketService.checkIn(request);
    assertThat(ticket.getCheckedInBy()).isSameAs(original);
    assertThat(ticket.getCheckedInAt()).isEqualTo(originalTime);
    assertThat(response.getTickets().getFirst().getCheckedInByName()).isEqualTo("Original staff");
    org.mockito.Mockito.verify(ticketRepository, org.mockito.Mockito.never()).save(any());
  }

  @Test
  void qrImageCheckInRecordsAuthenticatedStaff() {
    authenticate("staff");
    User staff = User.builder().id(7L).role(UserRole.STAFF).branchId(1L).build();
    Ticket ticket = paidTicketInBranch(1L);
    var file = new org.springframework.mock.web.MockMultipartFile("file", new byte[] {1});
    when(qrCodeReaderService.decodeQRCode(file)).thenReturn("10");
    when(userRepository.findByUsername("staff")).thenReturn(Optional.of(staff));
    when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));
    var response = ticketService.checkInByQRImage(file);
    assertThat(ticket.getCheckedInBy()).isSameAs(staff);
    assertThat(response.getTickets().getFirst().getCheckedInBy()).isEqualTo(7L);
  }

  @Test
  void bookingCodeCheckInRecordsStaffForEveryTicket() {
    authenticate("staff");
    User staff = User.builder().id(7L).role(UserRole.STAFF).branchId(1L).build();
    Ticket first = paidTicketInBranch(1L);
    Ticket second =
        Ticket.builder()
            .id(11L)
            .booking(first.getBooking())
            .showtime(first.getShowtime())
            .seat(Seat.builder().seatCode("A2").build())
            .ticketStatus(TicketStatus.BOOKED)
            .build();
    first.getBooking().setTickets(List.of(first, second));
    when(userRepository.findByUsername("staff")).thenReturn(Optional.of(staff));
    when(bookingRepository.findByBookingCode("BK-TEST"))
        .thenReturn(Optional.of(first.getBooking()));
    var request = new CheckInTicketRequest();
    request.setCode("BK-TEST");
    var response = ticketService.checkIn(request);
    assertThat(first.getCheckedInBy()).isSameAs(staff);
    assertThat(second.getCheckedInBy()).isSameAs(staff);
    assertThat(response.getTickets()).extracting("checkedInBy").containsExactly(7L, 7L);
  }

  @Test
  void wrongBranchDoesNotRecordAStaffCheckIn() {
    authenticate("staff");
    User staff = User.builder().id(7L).role(UserRole.STAFF).branchId(2L).build();
    Ticket ticket = paidTicketInBranch(1L);
    when(userRepository.findByUsername("staff")).thenReturn(Optional.of(staff));
    when(ticketRepository.findById(10L)).thenReturn(Optional.of(ticket));
    var request = new CheckInTicketRequest();
    request.setCode("10");
    assertThatThrownBy(() -> ticketService.checkIn(request)).isInstanceOf(AppException.class);
    assertThat(ticket.getCheckedInBy()).isNull();
    assertThat(ticket.getCheckedInAt()).isNull();
    org.mockito.Mockito.verify(ticketRepository, org.mockito.Mockito.never()).save(any());
  }

  private void authenticate(String username) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(username, "n/a", java.util.List.of()));
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
            .payment(Payment.builder().paymentStatus(PaymentStatus.PAID).build())
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
