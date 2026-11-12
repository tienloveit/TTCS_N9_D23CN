package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.dto.request.CreateVnpayRequest;
import com.ltweb.backend.dto.request.QueryRequest;
import com.ltweb.backend.dto.request.RefundRequest;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import com.ltweb.backend.util.VnpayUtil;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.client.RestTemplate;

@SuppressWarnings("unchecked")
class VnpayManagementSecurityTest {
  private final BookingRepository bookings = mock(BookingRepository.class);
  private final UserRepository users = mock(UserRepository.class);
  private final RestTemplate http = mock(RestTemplate.class);
  private final VnpayProperties props = new VnpayProperties();
  private VnpayService service;
  private Booking booking;
  private User operator;

  @BeforeEach
  void setUp() {
    props.setApiUrl("https://example.invalid/vnpay");
    props.setPayUrl("https://example.invalid/pay");
    props.setReturnUrl("https://example.invalid/return");
    props.setTmnCode("SYNTHETIC");
    props.setSecretKey("synthetic-vnpay-test-key");
    var transactions = mock(org.springframework.transaction.PlatformTransactionManager.class);
    when(transactions.getTransaction(any()))
        .thenReturn(new org.springframework.transaction.support.SimpleTransactionStatus());
    var refunds =
        BackendServiceFixtures.refund(
            bookings,
            mock(TicketRepository.class),
            users,
            org.mapstruct.factory.Mappers.getMapper(com.ltweb.backend.mapper.BookingMapper.class),
            mock(AuditLogService.class),
            mock(org.springframework.messaging.simp.SimpMessagingTemplate.class),
            new VnpayRefundGateway(
                BackendServiceFixtures.CLOCK,
                props,
                http,
                new com.fasterxml.jackson.databind.ObjectMapper()),
            transactions,
            mock(jakarta.persistence.EntityManager.class));
    service =
        BackendServiceFixtures.vnpay(
            props,
            http,
            bookings,
            mock(TicketRepository.class),
            mock(org.springframework.data.redis.core.RedisTemplate.class),
            mock(org.springframework.messaging.simp.SimpMessagingTemplate.class),
            mock(org.springframework.context.ApplicationEventPublisher.class),
            mock(FoodStockService.class),
            users,
            refunds);
    operator =
        User.builder()
            .username("operator")
            .role(UserRole.MANAGER)
            .status(UserStatus.ACTIVE)
            .branchId(5L)
            .build();
    booking =
        Booking.builder()
            .id(17L)
            .bookingCode("BK-SECURITY")
            .status(BookingStatus.REFUND_REQUESTED)
            .totalAmount(new BigDecimal("125000"))
            .showtime(
                Showtime.builder()
                    .room(Room.builder().branch(Branch.builder().branchId(5L).build()).build())
                    .build())
            .build();
    booking.getPayment().setPaymentMethod(PaymentMethod.VNPAY);
    booking.getPayment().setPaymentStatus(PaymentStatus.PAID);
    booking.getPayment().setAmount(new BigDecimal("125000"));
    booking.getPayment().setProviderTxnId("12345678");
    booking.getPayment().setPaymentCreatedAt(LocalDateTime.of(2026, 11, 12, 10, 20, 30));
    booking.getPayment().setPaidAt(LocalDateTime.of(2026, 11, 12, 10, 21));
    when(bookings.findByIdForUpdate(17L)).thenReturn(Optional.of(booking));
    when(bookings.findByBookingCodeForUpdate("BK-SECURITY")).thenReturn(Optional.of(booking));
    when(users.findByUsername("operator")).thenReturn(Optional.of(operator));
    when(http.postForEntity(eq(props.getApiUrl()), any(HttpEntity.class), eq(String.class)))
        .thenReturn(ResponseEntity.ok("{\"vnp_ResponseCode\":\"00\"}"));
    authenticate(UserRole.MANAGER);
  }

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void anonymousCannotQueryOrRefundEvenWhenServiceIsCalledDirectly() {
    SecurityContextHolder.clearContext();
    assertDenied(() -> service.refund(refund(), new MockHttpServletRequest()));
    assertDenied(() -> service.queryDr(query(), new MockHttpServletRequest()));
    verifyNoInteractions(http, users, bookings);
  }

  @ParameterizedTest
  @EnumSource(
      value = UserRole.class,
      names = {"USER", "STAFF"})
  void ordinaryUsersAndStaffCannotCallManagementOperations(UserRole role) {
    operator.setRole(role);
    authenticate(role);
    assertDenied(() -> service.refund(refund(), new MockHttpServletRequest()));
    assertDenied(() -> service.queryDr(query(), new MockHttpServletRequest()));
    verifyNoInteractions(http, bookings);
  }

  @Test
  void managerCannotAccessAnotherBranchOrOperateWithoutAnAssignment() {
    operator.setBranchId(6L);
    assertDenied(() -> service.refund(refund(), new MockHttpServletRequest()));
    assertDenied(() -> service.queryDr(query(), new MockHttpServletRequest()));
    operator.setBranchId(null);
    assertDenied(() -> service.refund(refund(), new MockHttpServletRequest()));
    verifyNoInteractions(http);
  }

  @ParameterizedTest
  @EnumSource(
      value = UserStatus.class,
      names = {"BLOCKED", "INACTIVE"})
  void staleAdminTokenCannotBypassCurrentDatabaseAccountStatus(UserStatus status) {
    authenticate(UserRole.ADMIN);
    operator.setRole(UserRole.ADMIN);
    operator.setStatus(status);
    assertDenied(() -> service.refund(refund(), new MockHttpServletRequest()));
    assertDenied(() -> service.queryDr(query(), new MockHttpServletRequest()));
    verifyNoInteractions(http, bookings);
  }

  @Test
  void deletedUserOrDowngradedRoleCannotUseStaleManagerClaims() {
    when(users.findByUsername("operator")).thenReturn(Optional.empty());
    assertDenied(() -> service.refund(refund(), new MockHttpServletRequest()));
    when(users.findByUsername("operator")).thenReturn(Optional.of(operator));
    operator.setRole(UserRole.USER);
    assertDenied(() -> service.queryDr(query(), new MockHttpServletRequest()));
    verifyNoInteractions(http, bookings);
  }

  @Test
  void refundPayloadAndSignatureUseStoredTransactionAndAuthenticatedOperator() {
    RefundRequest request = refund();
    request.setOrderId("BK-SECURITY");
    request.setUser("forged-admin");
    request.setTransDate("19000101000000");
    service.refund(request, new MockHttpServletRequest());
    Map<String, String> payload = sentPayload();
    assertThat(payload)
        .containsEntry("vnp_TxnRef", "17")
        .containsEntry("vnp_Amount", "12500000")
        .containsEntry("vnp_TransactionNo", "12345678")
        .containsEntry("vnp_TransactionDate", "20261112102030")
        .containsEntry("vnp_CreateBy", "operator")
        .containsEntry("vnp_TransactionType", "02");
    String hashInput =
        String.join(
            "|",
            payload.get("vnp_RequestId"),
            "2.1.0",
            "refund",
            "SYNTHETIC",
            "02",
            "17",
            "12500000",
            "12345678",
            "20261112102030",
            "operator",
            payload.get("vnp_CreateDate"),
            payload.get("vnp_IpAddr"),
            payload.get("vnp_OrderInfo"));
    assertThat(payload.get("vnp_SecureHash"))
        .isEqualTo(VnpayUtil.hmacSHA512(props.getSecretKey(), hashInput));
    assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
    verify(bookings, times(2)).save(booking);
    assertThat(booking.getPayment().getRefundGatewayStatus())
        .isEqualTo(RefundGatewayStatus.UNKNOWN);
  }

  @Test
  void adminCanQueryOtherBranchesUsingTheStoredTimestamp() {
    operator.setRole(UserRole.ADMIN);
    operator.setBranchId(99L);
    authenticate(UserRole.ADMIN);
    QueryRequest request = query();
    request.setOrderId("BK-SECURITY");
    request.setTransDate("19000101000000");
    service.queryDr(request, new MockHttpServletRequest());
    assertThat(sentPayload())
        .containsEntry("vnp_TxnRef", "17")
        .containsEntry("vnp_TransactionDate", "20261112102030");
  }

  @ParameterizedTest
  @EnumSource(
      value = BookingStatus.class,
      names = {"PENDING", "CANCELLED", "EXPIRED", "COMPLETED"})
  void refundRequiresAnOutstandingRefundRequest(BookingStatus status) {
    booking.setStatus(status);
    assertThatThrownBy(() -> service.refund(refund(), new MockHttpServletRequest()))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.BOOKING_CANNOT_REFUND);
    verifyNoInteractions(http);
  }

  @Test
  void missingOrNonVnpayTransactionCannotReachTheGateway() {
    booking.getPayment().setPaymentMethod(PaymentMethod.CASH);
    assertThatThrownBy(() -> service.refund(refund(), new MockHttpServletRequest()))
        .isInstanceOf(AppException.class);
    assertThatThrownBy(() -> service.queryDr(query(), new MockHttpServletRequest()))
        .isInstanceOf(AppException.class);
    booking.getPayment().setPaymentMethod(PaymentMethod.VNPAY);
    booking.getPayment().setPaymentCreatedAt(null);
    assertThatThrownBy(() -> service.refund(refund(), new MockHttpServletRequest()))
        .isInstanceOf(AppException.class);
    verifyNoInteractions(http);
  }

  @Test
  void checkedInOrUnpaidBookingCannotBeRefunded() {
    booking.getTickets().add(Ticket.builder().checkedInAt(LocalDateTime.now()).build());
    assertThatThrownBy(() -> service.refund(refund(), new MockHttpServletRequest()))
        .isInstanceOf(AppException.class);
    booking.getTickets().clear();
    booking.getPayment().setPaymentStatus(PaymentStatus.PENDING);
    assertThatThrownBy(() -> service.refund(refund(), new MockHttpServletRequest()))
        .isInstanceOf(AppException.class);
    verifyNoInteractions(http);
  }

  @Test
  void paymentUrlUsesTheSameStoredTimestampAsLaterQueryAndRefund() {
    booking.setStatus(BookingStatus.PENDING);
    booking.setExpiresAt(LocalDateTime.now().plusMinutes(5));
    booking.getPayment().setPaymentStatus(PaymentStatus.PENDING);
    booking.setUser(User.builder().username("operator").build());
    CreateVnpayRequest request = new CreateVnpayRequest();
    request.setBookingId(17L);
    String url =
        (String) service.createPaymentUrl(request, new MockHttpServletRequest()).get("paymentUrl");
    assertThat(url)
        .contains(
            "vnp_CreateDate="
                + booking
                    .getPayment()
                    .getPaymentCreatedAt()
                    .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
  }

  private void authenticate(UserRole role) {
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(
        new UsernamePasswordAuthenticationToken(
            "operator", "n/a", List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))));
    SecurityContextHolder.setContext(context);
  }

  @Test
  void mismatchedAmountOrPartialRefundIsRejectedInsteadOfChangingTheRequestedAmount() {
    RefundRequest request = refund();
    request.setAmount(1L);
    assertThatThrownBy(() -> service.refund(request, new MockHttpServletRequest()))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.VALIDATION_ERROR);
    request.setAmount(Long.MAX_VALUE);
    assertThatThrownBy(() -> service.refund(request, new MockHttpServletRequest()))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.VALIDATION_ERROR);
    request.setAmount(125000L);
    request.setTrantype("03");
    assertThatThrownBy(() -> service.refund(request, new MockHttpServletRequest()))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.VALIDATION_ERROR);
    verifyNoInteractions(http);
  }

  private RefundRequest refund() {
    RefundRequest request = new RefundRequest();
    request.setOrderId("17");
    request.setTrantype("02");
    request.setAmount(125000L);
    request.setTransDate("20261112102030");
    request.setUser("operator");
    return request;
  }

  private QueryRequest query() {
    QueryRequest request = new QueryRequest();
    request.setOrderId("17");
    request.setTransDate("20261112102030");
    return request;
  }

  private Map<String, String> sentPayload() {
    ArgumentCaptor<HttpEntity<Map<String, String>>> captor =
        ArgumentCaptor.forClass(HttpEntity.class);
    verify(http).postForEntity(eq(props.getApiUrl()), captor.capture(), eq(String.class));
    return captor.getValue().getBody();
  }

  private void assertDenied(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
    assertThatThrownBy(call)
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.ACCESS_DENIED);
  }
}
