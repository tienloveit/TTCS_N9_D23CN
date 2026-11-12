package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.RefundRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.dto.response.SeatStatusEvent;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Payment;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Commits the attempt before network I/O; commits money/seat changes only after verified success. */
@Service
@RequiredArgsConstructor
public class BookingRefundService {
    private final BookingRepository bookings;
    private final TicketRepository tickets;
    private final UserRepository users;
    private final BookingMapper mapper;
    private final AuditLogService audit;
    private final SimpMessagingTemplate messaging;
    private final VnpayRefundGateway gateway;
    private final PlatformTransactionManager transactionManager;
    private final jakarta.persistence.EntityManager entityManager;

    private record Decision(VnpayRefundGateway.Order order, boolean submit, BookingResponse response) {}

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public BookingResponse processRefund(Long id, boolean approved, String note) {
        String ip = RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                ? attributes.getRequest().getRemoteAddr() : "127.0.0.1";
        return process(id, null, approved, note, ip);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public BookingResponse processDirectRefund(RefundRequest request, String ip) {
        return process(null, request, true, null, ip);
    }

    private BookingResponse process(Long id, RefundRequest direct, boolean approved, String note, String ip) {
        Decision decision = transaction().execute(status -> prepare(id, direct, approved, note, ip));
        if (decision.order() == null) return decision.response();
        // This line runs only AFTER the claim transaction has successfully committed.
        VnpayRefundGateway.Result result;
        try {
            result = decision.submit() ? gateway.refund(decision.order()) : gateway.query(decision.order());
        } catch (RuntimeException unknown) {
            result = VnpayRefundGateway.Result.unknown();
        }
        VnpayRefundGateway.Result outcome = result == null ? VnpayRefundGateway.Result.unknown() : result;
        return transaction().execute(status -> finish(decision.order(), outcome));
    }

    private Decision prepare(Long id, RefundRequest direct, boolean approved, String note, String ip) {
        // OSIV can reuse a persistence context across transactions in the same HTTP request.
        entityManager.clear();
        User operator = currentOperator();
        Booking booking = direct == null ? locked(id) : lockedReference(direct.getOrderId());
        requireAccess(booking, operator);
        Payment p = booking.getPayment();
        if (p == null) throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
        if (direct != null && (p.getPaymentMethod() != PaymentMethod.VNPAY
                || !"02".equals(direct.getTrantype()) || direct.getAmount() == null
                || p.getAmount() == null || BigDecimal.valueOf(direct.getAmount()).compareTo(p.getAmount()) != 0)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
        if (approved && booking.getStatus() == BookingStatus.REFUNDED) return done(booking);
        if (booking.getStatus() != BookingStatus.REFUND_REQUESTED) {
            throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
        }
        boolean unresolved = p.getRefundGatewayStatus() == RefundGatewayStatus.PROCESSING
                || p.getRefundGatewayStatus() == RefundGatewayStatus.UNKNOWN;
        if (!approved) {
            if (unresolved) throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
            booking.setStatus(BookingStatus.COMPLETED);
            p.setRefundReason(null);
            p.setRefundAmount(BigDecimal.ZERO);
            recordOperator(p, operator, note);
            audit.record(AuditAction.REFUND_REJECTED, "Booking", id, "Refund rejected for " + booking.getBookingCode());
            bookings.save(booking);
            return done(booking);
        }
        if (p.getPaymentStatus() != PaymentStatus.PAID
                || booking.getTickets().stream().anyMatch(ticket -> ticket.getCheckedInAt() != null)) {
            throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
        }
        if (p.getPaymentMethod() == PaymentMethod.CASH) {
            recordOperator(p, operator, note);
            complete(booking);
            return done(booking);
        }
        if (p.getPaymentMethod() != PaymentMethod.VNPAY || p.getPaymentCreatedAt() == null
                || p.getPaidAt() == null || p.getProviderTxnId() == null || p.getProviderTxnId().isBlank()
                || p.getAmount() == null || p.getAmount().signum() <= 0
                || p.getAmount().compareTo(booking.getTotalAmount()) != 0) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_STATUS);
        }
        if (p.getRefundGatewayStatus() == RefundGatewayStatus.PROCESSING
                && p.getRefundRequestedAt() != null
                && p.getRefundRequestedAt().plusSeconds(60).isAfter(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")))) {
            return done(booking); // Another request owns the bounded gateway call.
        }
        boolean submit = !unresolved;
        if (submit) {
            p.setRefundRequestId(UUID.randomUUID().toString().replace("-", ""));
            p.setRefundRequestedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
            p.setRefundGatewayStatus(RefundGatewayStatus.PROCESSING);
            p.setRefundGatewayCode(null);
            p.setRefundGatewayMessage("Đang chờ VNPay xác nhận hoàn tiền.");
            recordOperator(p, operator, note);
            bookings.save(booking);
        }
        if (p.getRefundRequestId() == null || p.getRefundRequestedAt() == null || p.getRefundProcessedBy() == null) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_STATUS);
        }
        return new Decision(new VnpayRefundGateway.Order(booking.getId(), p.getRefundRequestId(), p.getAmount(),
                p.getProviderTxnId(), p.getPaymentCreatedAt(), p.getRefundRequestedAt(),
                p.getRefundProcessedBy().getUsername(), ip == null ? "127.0.0.1" : ip), submit, null);
    }

    private BookingResponse finish(VnpayRefundGateway.Order order, VnpayRefundGateway.Result result) {
        entityManager.clear(); // Re-read the durable attempt under lock, including concurrent updates.
        Booking booking = locked(order.bookingId());
        Payment p = booking.getPayment();
        if (booking.getStatus() == BookingStatus.REFUNDED) return mapper.toBookingResponse(booking);
        if (!Objects.equals(order.requestId(), p.getRefundRequestId())) return mapper.toBookingResponse(booking);
        if (booking.getStatus() != BookingStatus.REFUND_REQUESTED) {
            throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
        }
        p.setRefundGatewayStatus(result.status());
        p.setRefundGatewayCode(result.code());
        p.setRefundGatewayMessage(result.message());
        if (result.status() == RefundGatewayStatus.SUCCEEDED) complete(booking);
        else bookings.save(booking);
        return mapper.toBookingResponse(booking);
    }

    private void complete(Booking booking) {
        if (booking.getTickets().stream().anyMatch(ticket -> ticket.getCheckedInAt() != null)) {
            throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
        }
        Payment p = booking.getPayment();
        booking.setStatus(BookingStatus.REFUNDED);
        p.setPaymentStatus(PaymentStatus.REFUNDED);
        p.setRefundedAt(LocalDateTime.now());
        p.setRefundAmount(booking.getTotalAmount());
        booking.getTickets().forEach(ticket -> {
            ticket.setBooking(null);
            ticket.setTicketStatus(TicketStatus.AVAILABLE);
            ticket.setQrCode(null);
            ticket.setCheckedInAt(null);
            ticket.setCheckedInBy(null);
            tickets.save(ticket);
            BookingTransactionEffects.afterCommit(() -> messaging.convertAndSend(
                    "/topic/showtime/" + booking.getShowtime().getId() + "/seats",
                    SeatStatusEvent.builder().seatId(ticket.getSeat().getId()).status("AVAILABLE").build()));
        });
        User customer = booking.getUser();
        if (customer != null && customer.getTotalSpending() != null) {
            customer.setTotalSpending(customer.getTotalSpending().subtract(booking.getTotalAmount()).max(BigDecimal.ZERO));
            customer.setMembershipTier(MembershipTier.fromSpending(customer.getTotalSpending()));
            users.save(customer);
        }
        audit.record(AuditAction.REFUND_APPROVED, "Booking", booking.getId(), "Refund confirmed for " + booking.getBookingCode());
        bookings.save(booking);
    }

    private User currentOperator() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        User user = users.findByUsername(authentication.getName()).orElseThrow(() -> new AppException(ErrorCode.ACCESS_DENIED));
        if (!user.isEnabled() || !user.isAccountNonLocked()
                || (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.MANAGER)) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        return user;
    }

    private void requireAccess(Booking b, User u) {
        if (u.getRole() == UserRole.ADMIN) return;
        if (u.getBranchId() == null || b.getShowtime() == null || b.getShowtime().getRoom() == null
                || b.getShowtime().getRoom().getBranch() == null
                || !u.getBranchId().equals(b.getShowtime().getRoom().getBranch().getBranchId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }

    private Booking locked(Long id) {
        return bookings.findByIdForUpdate(id).orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
    }

    private Booking lockedReference(String reference) {
        try { return locked(Long.valueOf(reference)); }
        catch (NumberFormatException e) {
            return bookings.findByBookingCodeForUpdate(reference).orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        }
    }

    private void recordOperator(Payment p, User u, String note) {
        p.setRefundProcessedBy(u);
        p.setRefundProcessedAt(LocalDateTime.now());
        p.setRefundProcessNote(note == null || note.isBlank() ? null : note.trim());
    }

    private Decision done(Booking b) { return new Decision(null, false, mapper.toBookingResponse(b)); }

    private TransactionTemplate transaction() {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return template;
    }
}
