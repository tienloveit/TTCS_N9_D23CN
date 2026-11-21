package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.CreateSeatRequest;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.NotificationType;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.exception.GlobalExceptionHandler;
import com.ltweb.backend.mapper.SeatMapper;
import com.ltweb.backend.repository.*;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.WebRequest;

/** Trạng thái đọc theo người, nhật ký thanh toán, sức chứa phòng và lỗi ràng buộc dữ liệu. */
class DataIntegrityRulesTest {
  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  // ===== Thông báo: đã đọc theo từng người =====

  @Test
  void readingABranchNotificationOnlyMarksItForTheReader() {
    User first = staff(1L, "staff-a");
    User second = staff(2L, "staff-b");
    Notification shared =
        Notification.builder()
            .id(10L)
            .recipientRole(UserRole.STAFF)
            .branchId(7L)
            .type(NotificationType.SYSTEM)
            .title("t")
            .message("m")
            .createdAt(LocalDateTime.now())
            .build();
    var notifications = mock(NotificationRepository.class);
    when(notifications.findVisibleCandidates(any(), eq(UserRole.STAFF), eq(7L), any()))
        .thenReturn(List.of(shared));
    when(notifications.findById(10L)).thenReturn(Optional.of(shared));
    List<NotificationRead> reads = new ArrayList<>();
    var readRepository = mock(NotificationReadRepository.class);
    when(readRepository.save(any()))
        .thenAnswer(
            call -> {
              reads.add(call.getArgument(0));
              return call.getArgument(0);
            });
    when(readRepository.findByUserIdAndNotificationId(anyLong(), anyLong()))
        .thenAnswer(
            call ->
                reads.stream()
                    .filter(
                        r ->
                            r.getUserId().equals(call.getArgument(0))
                                && r.getNotificationId().equals(call.getArgument(1)))
                    .findFirst());
    when(readRepository.findByUserIdAndNotificationIdIn(anyLong(), any()))
        .thenAnswer(
            call -> reads.stream().filter(r -> r.getUserId().equals(call.getArgument(0))).toList());
    var users = mock(UserRepository.class);
    when(users.findByUsername("staff-a")).thenReturn(Optional.of(first));
    when(users.findByUsername("staff-b")).thenReturn(Optional.of(second));
    var service =
        new NotificationService(BackendServiceFixtures.CLOCK, notifications, readRepository, users);

    signIn(first);
    assertThat(service.countUnread()).isEqualTo(1);
    var marked = service.markRead(10L);
    assertThat(marked.isRead()).isTrue();
    assertThat(service.markRead(10L).getReadAt()).isEqualTo(marked.getReadAt()); // không tạo lại
    assertThat(service.countUnread()).isZero();

    signIn(second);
    assertThat(service.countUnread()).isEqualTo(1);
    assertThat(service.getMyNotifications().get(0).isRead()).isFalse();
    verify(readRepository, times(1)).save(any());
  }

  // ===== Nhật ký thanh toán =====

  @Test
  void callbackEventKeepsReconciliationFieldsButNotTheSignature() {
    var repository = mock(PaymentEventRepository.class);
    var service = new PaymentEventService(repository, BackendServiceFixtures.CLOCK);

    service.recordCallback(
        PaymentEvent.Type.VNPAY_IPN,
        5L,
        Map.of(
            "vnp_TxnRef", "5",
            "vnp_Amount", "10000000",
            "vnp_ResponseCode", "00",
            "vnp_TransactionStatus", "00",
            "vnp_TransactionNo", "VNP-1",
            "vnp_SecureHash", "secret-hash"),
        true,
        "00",
        "Confirm Success");

    ArgumentCaptor<PaymentEvent> saved = ArgumentCaptor.forClass(PaymentEvent.class);
    verify(repository).save(saved.capture());
    PaymentEvent event = saved.getValue();
    assertThat(event.getBookingId()).isEqualTo(5L);
    assertThat(event.getAmount()).isEqualByComparingTo("100000");
    assertThat(event.getProviderTxnId()).isEqualTo("VNP-1");
    assertThat(event.getValidSignature()).isTrue();
    assertThat(event.getCreatedAt()).isNotNull();
    assertThat(event.toString()).doesNotContain("secret-hash");
  }

  @Test
  void malformedCallbackAmountIsStoredAsUnknown() {
    var repository = mock(PaymentEventRepository.class);
    new PaymentEventService(repository, BackendServiceFixtures.CLOCK)
        .recordCallback(
            PaymentEvent.Type.VNPAY_RETURN,
            null,
            Map.of("vnp_Amount", "1e9"),
            false,
            "97",
            "Invalid Checksum");
    ArgumentCaptor<PaymentEvent> saved = ArgumentCaptor.forClass(PaymentEvent.class);
    verify(repository).save(saved.capture());
    assertThat(saved.getValue().getAmount()).isNull();
    assertThat(saved.getValue().getValidSignature()).isFalse();
  }

  // ===== Sức chứa phòng =====

  @Test
  void addingOrRemovingASeatKeepsRoomCapacityEqualToSeatCount() {
    User admin = User.builder().id(1L).username("admin").role(UserRole.ADMIN).build();
    signIn(admin);
    Room room = Room.builder().id(3L).seatCapacity(50).build();
    var seats = mock(SeatRepository.class);
    var rooms = mock(RoomRepository.class);
    var users = mock(UserRepository.class);
    var mapper = mock(SeatMapper.class);
    when(users.findByUsername("admin")).thenReturn(Optional.of(admin));
    when(rooms.findById(3L)).thenReturn(Optional.of(room));
    when(mapper.toSeat(any())).thenReturn(new Seat());
    when(seats.save(any())).thenAnswer(call -> call.getArgument(0));
    when(seats.countByRoomId(3L)).thenReturn(51L, 50L);
    var service = new SeatService(seats, rooms, users, mapper);

    CreateSeatRequest request = new CreateSeatRequest();
    request.setRoomId(3L);
    request.setSeatCode("Z1");
    service.createSeat(request);
    assertThat(room.getSeatCapacity()).isEqualTo(51);

    Seat seat = Seat.builder().id(9L).room(room).build();
    when(seats.findById(9L)).thenReturn(Optional.of(seat));
    service.deleteSeat(9L);
    assertThat(room.getSeatCapacity()).isEqualTo(50);
  }

  // ===== Lỗi ràng buộc dữ liệu =====

  @Test
  void integrityErrorsAreClassifiedWithoutLeakingSql() {
    assertThat(classify(1451)).isEqualTo(ErrorCode.RESOURCE_IN_USE);
    assertThat(classify(1062)).isEqualTo(ErrorCode.DUPLICATE_VALUE);
    assertThat(classify(3819)).isEqualTo(ErrorCode.DATA_INTEGRITY_VIOLATION);

    var request = mock(WebRequest.class);
    when(request.getDescription(false)).thenReturn("uri=/api/branch/1");
    var response =
        new GlobalExceptionHandler()
            .handleDataIntegrityViolation(
                violation(1451, "Cannot delete row: FOREIGN KEY `fk_users_branch`"), request);
    assertThat(response.getStatusCode().value()).isEqualTo(409);
    assertThat(response.getBody().getMessage()).doesNotContain("fk_users_branch");
  }

  private static ErrorCode classify(int mysqlErrorCode) {
    return GlobalExceptionHandler.classifyIntegrityViolation(violation(mysqlErrorCode, "detail"));
  }

  private static DataIntegrityViolationException violation(int mysqlErrorCode, String detail) {
    return new DataIntegrityViolationException(
        "could not execute statement", new SQLException(detail, "23000", mysqlErrorCode));
  }

  private static User staff(Long id, String username) {
    return User.builder()
        .id(id)
        .username(username)
        .role(UserRole.STAFF)
        .branchId(7L)
        .totalSpending(BigDecimal.ZERO)
        .build();
  }

  private static void signIn(User user) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(user.getUsername(), "unused", List.of()));
  }
}
