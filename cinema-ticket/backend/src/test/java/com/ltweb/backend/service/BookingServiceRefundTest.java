package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class BookingServiceRefundTest {
  @Mock private BookingRepository bookingRepository;
  @Mock private ShowtimeRepository showtimeRepository;
  @Mock private TicketRepository ticketRepository;
  @Mock private FoodRepository foodRepository;
  @Mock private UserRepository userRepository;
  @Mock private RedisTemplate<String, String> redisTemplate;
  @Mock private SimpMessagingTemplate simpMessagingTemplate;
  @Mock private BookingMapper bookingMapper;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private ApplicationEventPublisher eventPublisher;
  @Mock private PromotionService promotionService;
  @Mock private AuditLogService auditLogService;

  @InjectMocks private BookingService bookingService;

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void processRefund_doesNotAssumeFoodPhysicallyReturned() {
    authenticate("manager");
    User manager = User.builder().id(7L).username("manager").role(UserRole.MANAGER).branchId(1L).build();
    Booking booking = refundRequestedBookingInBranch(1L);
    booking.setTickets(List.of());
    when(userRepository.findByUsername("manager")).thenReturn(Optional.of(manager));
    when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));

    bookingService.processRefund(5L, true, "Approved financial refund");

    org.assertj.core.api.Assertions.assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUNDED);
    org.assertj.core.api.Assertions.assertThat(booking.getPayment().getPaymentStatus())
        .isEqualTo(com.ltweb.backend.enums.PaymentStatus.REFUNDED);
    org.assertj.core.api.Assertions.assertThat(booking.getPayment().getRefundAmount())
        .isEqualByComparingTo(booking.getTotalAmount());
    org.assertj.core.api.Assertions.assertThat(booking.getPayment().getRefundProcessedBy()).isSameAs(manager);
    org.assertj.core.api.Assertions.assertThat(booking.getPayment().getRefundProcessNote())
        .isEqualTo("Approved financial refund");
    verify(bookingRepository).save(booking);
  }

  @Test
  void processRefund_rejectsStaffEvenWhenBookingIsSameBranch() {
    authenticate("staff");
    User staff = User.builder().id(7L).username("staff").role(UserRole.STAFF).branchId(1L).build();
    Booking booking = refundRequestedBookingInBranch(1L);
    when(userRepository.findByUsername("staff")).thenReturn(Optional.of(staff));
    when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));

    assertThatThrownBy(() -> bookingService.processRefund(5L, true))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.UNAUTHORIZED);
  }

  private void authenticate(String username) {
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(username, "n/a"));
  }

  private Booking refundRequestedBookingInBranch(Long branchId) {
    Branch branch = Branch.builder().branchId(branchId).name("Branch").build();
    Room room = Room.builder().id(2L).name("Room 1").branch(branch).build();
    Showtime showtime = Showtime.builder().id(3L).room(room).build();
    return Booking.builder()
        .id(5L)
        .bookingCode("BK-REFUND")
        .showtime(showtime)
        .totalAmount(BigDecimal.valueOf(100000))
        .status(BookingStatus.REFUND_REQUESTED)
        .build();
  }
}
