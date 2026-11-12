package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.RefundRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.*;
import org.springframework.transaction.support.SimpleTransactionStatus;

class BookingRefundFlowTest {
    private final BookingRepository bookings = mock(BookingRepository.class);
    private final TicketRepository tickets = mock(TicketRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final BookingMapper mapper = mock(BookingMapper.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    private final VnpayRefundGateway gateway = mock(VnpayRefundGateway.class);
    private final SerialTransactions transactions = new SerialTransactions();
    private final jakarta.persistence.EntityManager entityManager = mock(jakarta.persistence.EntityManager.class);
    private BookingRefundService service;
    private Booking booking;
    private User customer;
    private Ticket ticket;

    @BeforeEach
    void setUp() {
        service = new BookingRefundService(bookings, tickets, users, mapper, audit, messaging, gateway, transactions, entityManager);
        User admin = User.builder().id(9L).username("admin").role(UserRole.ADMIN).status(UserStatus.ACTIVE).build();
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin));
        customer = User.builder().id(1L).totalSpending(new BigDecimal("300000")).build();
        booking = Booking.builder().id(5L).bookingCode("BK-REFUND-FLOW").user(customer)
                .status(BookingStatus.REFUND_REQUESTED).totalAmount(new BigDecimal("100000"))
                .showtime(Showtime.builder().id(3L).build()).build();
        var payment = booking.getPayment();
        payment.setPaymentMethod(PaymentMethod.VNPAY);
        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setAmount(booking.getTotalAmount());
        payment.setPaymentCreatedAt(LocalDateTime.now().minusMinutes(10));
        payment.setPaidAt(LocalDateTime.now().minusMinutes(9));
        payment.setProviderTxnId("123456");
        ticket = Ticket.builder().id(11L).booking(booking).ticketStatus(TicketStatus.BOOKED)
                .seat(Seat.builder().id(4L).build()).qrCode("QR").build();
        booking.getTickets().add(ticket);
        when(bookings.findByIdForUpdate(5L)).thenReturn(Optional.of(booking));
        when(mapper.toBookingResponse(any())).thenAnswer(call -> {
            Booking b = call.getArgument(0);
            return BookingResponse.builder().bookingId(b.getId()).status(b.getStatus())
                    .refundGatewayStatus(b.getPayment().getRefundGatewayStatus())
                    .refundGatewayMessage(b.getPayment().getRefundGatewayMessage()).build();
        });
        authenticate();
    }

    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    @Test
    void gatewayCallRunsAfterDurableClaimAndSuccessfulResponseReleasesSeatsExactlyOnce() {
        when(gateway.refund(any())).thenAnswer(call -> {
            assertThat(transactions.commits.get()).isEqualTo(1);
            assertThat(booking.getPayment().getRefundRequestId()).hasSize(32);
            assertStillPaidAndReserved();
            return success();
        });
        assertThat(service.processRefund(5L, true, "approved").getStatus()).isEqualTo(BookingStatus.REFUNDED);
        assertThat(booking.getPayment().getRefundedAt()).isNotNull();
        assertThat(booking.getPayment().getRefundGatewayStatus()).isEqualTo(RefundGatewayStatus.SUCCEEDED);
        assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.AVAILABLE);
        assertThat(ticket.getBooking()).isNull();
        assertThat(ticket.getQrCode()).isNull();
        assertThat(customer.getTotalSpending()).isEqualByComparingTo("200000");
        service.processRefund(5L, true, "repeated click");
        verify(gateway).refund(any());
        verify(tickets).save(ticket);
        verify(users).save(customer);
        verify(audit).record(eq(AuditAction.REFUND_APPROVED), anyString(), eq(5L), anyString());
    }

    @Test
    void timeoutKeepsMoneyAndSeatsAndRepeatedApprovalQueriesWithoutResending() {
        when(gateway.refund(any())).thenThrow(new org.springframework.web.client.ResourceAccessException("timeout"));
        assertThat(service.processRefund(5L, true, null).getRefundGatewayStatus()).isEqualTo(RefundGatewayStatus.UNKNOWN);
        String originalRequest = booking.getPayment().getRefundRequestId();
        assertStillPaidAndReserved();
        when(gateway.query(any())).thenReturn(success());
        assertThat(service.processRefund(5L, true, null).getStatus()).isEqualTo(BookingStatus.REFUNDED);
        assertThat(booking.getPayment().getRefundRequestId()).isEqualTo(originalRequest);
        verify(gateway).refund(any());
        verify(gateway).query(any());
    }

    @ParameterizedTest
    @EnumSource(value = RefundGatewayStatus.class, names = {"UNKNOWN", "FAILED"})
    void unconfirmedOrRejectedGatewayResultNeverReleasesSeatsOrChangesSpending(RefundGatewayStatus state) {
        when(gateway.refund(any())).thenReturn(new VnpayRefundGateway.Result(state, "99", "unconfirmed"));
        assertThat(service.processRefund(5L, true, null).getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
        assertStillPaidAndReserved();
        verifyNoInteractions(tickets, audit, messaging);
        verify(users, never()).save(any());
    }

    @Test
    void unresolvedRefundCannotBeRejectedAndAnOriginalPaidQueryDoesNotTriggerResubmission() {
        when(gateway.refund(any())).thenReturn(VnpayRefundGateway.Result.unknown());
        service.processRefund(5L, true, null);
        assertThatThrownBy(() -> service.processRefund(5L, false, "reject")).isInstanceOf(AppException.class);
        when(gateway.query(any())).thenReturn(VnpayRefundGateway.Result.unknown());
        service.processRefund(5L, true, null);
        service.processRefund(5L, true, null);
        assertStillPaidAndReserved();
        verify(gateway, times(1)).refund(any());
        verify(gateway, times(2)).query(any());
    }

    @Test
    void definiteFailureAllowsAnExplicitNewAttemptWithANewRequestId() {
        when(gateway.refund(any())).thenReturn(new VnpayRefundGateway.Result(RefundGatewayStatus.FAILED, "93", "failed"));
        service.processRefund(5L, true, null);
        String firstId = booking.getPayment().getRefundRequestId();
        when(gateway.refund(any())).thenReturn(success());
        service.processRefund(5L, true, null);
        assertThat(booking.getPayment().getRefundRequestId()).isNotEqualTo(firstId);
        verify(gateway, times(2)).refund(any());
    }

    @Test
    void concurrentApprovalsSendOnlyOneMoneyOperation() throws Exception {
        CountDownLatch sending = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        when(gateway.refund(any())).thenAnswer(call -> {
            sending.countDown();
            if (!finish.await(5, TimeUnit.SECONDS)) throw new AssertionError("gateway timeout");
            return success();
        });
        try (var pool = Executors.newSingleThreadExecutor()) {
            var first = pool.submit(() -> { authenticate(); return service.processRefund(5L, true, null); });
            try {
                assertThat(sending.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(service.processRefund(5L, true, null).getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
            } finally { finish.countDown(); }
            assertThat(first.get(5, TimeUnit.SECONDS).getStatus()).isEqualTo(BookingStatus.REFUNDED);
        }
        verify(gateway).refund(any());
        verify(gateway, never()).query(any());
    }

    @Test
    void failedClaimCommitNeverCallsGateway() {
        transactions.failNextCommit = true;
        assertThatThrownBy(() -> service.processRefund(5L, true, null)).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(gateway, tickets, messaging);
    }

    @Test
    void crashAfterGatewaySuccessCanRecoverByQueryWithoutSendingAnotherRefund() {
        when(gateway.refund(any())).thenAnswer(call -> {
            transactions.failNextCommit = true;
            return success();
        });
        assertThatThrownBy(() -> service.processRefund(5L, true, null)).isInstanceOf(IllegalStateException.class);
        // Model database rollback of finalization; the separately committed attempt survives.
        booking.setStatus(BookingStatus.REFUND_REQUESTED);
        booking.getPayment().setPaymentStatus(PaymentStatus.PAID);
        booking.getPayment().setRefundGatewayStatus(RefundGatewayStatus.PROCESSING);
        booking.getPayment().setRefundRequestedAt(LocalDateTime.now().minusMinutes(2));
        booking.getPayment().setRefundedAt(null);
        ticket.setBooking(booking);
        ticket.setTicketStatus(TicketStatus.BOOKED);
        customer.setTotalSpending(new BigDecimal("300000"));
        when(gateway.query(any())).thenReturn(success());
        service.processRefund(5L, true, null);
        verify(gateway).refund(any());
        verify(gateway).query(any());
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUNDED);
        assertThat(customer.getTotalSpending()).isEqualByComparingTo("200000");
    }

    @Test
    void cashRefundAndRejectionDoNotContactTheGateway() {
        booking.getPayment().setPaymentMethod(PaymentMethod.CASH);
        service.processRefund(5L, false, "not eligible");
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.COMPLETED);
        booking.setStatus(BookingStatus.REFUND_REQUESTED);
        service.processRefund(5L, true, "cash returned at counter");
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUNDED);
        verifyNoInteractions(gateway);
    }

    @Test
    void lateResponseCannotCompleteANewerDurableAttempt() {
        Booking newer = Booking.builder().id(5L).status(BookingStatus.REFUND_REQUESTED).build();
        newer.getPayment().setPaymentStatus(PaymentStatus.PAID);
        newer.getPayment().setRefundRequestId("newer-attempt");
        newer.getPayment().setRefundGatewayStatus(RefundGatewayStatus.PROCESSING);
        when(bookings.findByIdForUpdate(5L)).thenReturn(Optional.of(booking), Optional.of(newer));
        when(gateway.refund(any())).thenReturn(success());

        assertThat(service.processRefund(5L, true, null).getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
        assertThat(newer.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(newer.getPayment().getRefundRequestId()).isEqualTo("newer-attempt");
        verifyNoInteractions(tickets, audit, messaging);
        var reads = inOrder(entityManager, bookings);
        reads.verify(entityManager).clear();
        reads.verify(bookings).findByIdForUpdate(5L);
        reads.verify(bookings).save(booking);
        reads.verify(entityManager).clear();
        reads.verify(bookings).findByIdForUpdate(5L);
    }

    @Test
    void directGatewayEndpointUsesTheSameAttemptAndCannotBypassUnknownState() {
        when(gateway.refund(any())).thenReturn(VnpayRefundGateway.Result.unknown());
        service.processRefund(5L, true, null);
        RefundRequest request = new RefundRequest();
        request.setOrderId("5"); request.setAmount(100000L); request.setTrantype("02");
        when(gateway.query(any())).thenReturn(success());
        assertThat(service.processDirectRefund(request, "127.0.0.1").getStatus()).isEqualTo(BookingStatus.REFUNDED);
        verify(gateway).refund(any());
        verify(gateway).query(any());
    }

    private void assertStillPaidAndReserved() {
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.REFUND_REQUESTED);
        assertThat(booking.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(booking.getPayment().getRefundedAt()).isNull();
        assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.BOOKED);
        assertThat(ticket.getBooking()).isSameAs(booking);
        assertThat(customer.getTotalSpending()).isEqualByComparingTo("300000");
    }

    private VnpayRefundGateway.Result success() {
        return new VnpayRefundGateway.Result(RefundGatewayStatus.SUCCEEDED, "00", "confirmed");
    }

    private void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin", "n/a", List.of()));
    }

    private static class SerialTransactions implements PlatformTransactionManager {
        private final ReentrantLock lock = new ReentrantLock();
        private final AtomicInteger commits = new AtomicInteger();
        boolean failNextCommit;
        public TransactionStatus getTransaction(TransactionDefinition definition) { lock.lock(); return new SimpleTransactionStatus(); }
        public void commit(TransactionStatus status) {
            try {
                if (failNextCommit) { failNextCommit = false; throw new IllegalStateException("simulated commit failure"); }
                commits.incrementAndGet();
            } finally { lock.unlock(); }
        }
        public void rollback(TransactionStatus status) { if (lock.isHeldByCurrentThread()) lock.unlock(); }
    }
}
