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
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Commits the attempt before network I/O; commits money/seat changes only after verified success.
 */
@Service
@RequiredArgsConstructor
public class BookingRefundService {
  private final CurrentUserProvider currentUserProvider;
  private final BookingAccessPolicy bookingAccessPolicy;
  private final RefundPolicy refundPolicy;
  private final java.time.Clock clock;
  private static final long GATEWAY_CLAIM_SECONDS = 60;
  private final BookingRepository bookings;
  private final TicketRepository tickets;
  private final UserRepository users;
  private final BookingMapper mapper;
  private final AuditLogService audit;
  private final SimpMessagingTemplate messaging;
  private final VnpayRefundGateway gateway;
  private final PlatformTransactionManager transactionManager;
  private final jakarta.persistence.EntityManager entityManager;

  private enum GatewayAction {
    SUBMIT,
    QUERY,
    RETURN_EXISTING
  }

  private record Decision(
      GatewayAction action, VnpayRefundGateway.Order order, BookingResponse response) {
    private Decision {
      Objects.requireNonNull(action);
      if (action == GatewayAction.RETURN_EXISTING) Objects.requireNonNull(response);
      else Objects.requireNonNull(order);
    }
  }

  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public BookingResponse processRefund(Long id, boolean approved, String note) {
    String ip =
        RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
            ? attributes.getRequest().getRemoteAddr()
            : "127.0.0.1";
    return process(id, null, approved, note, ip);
  }

  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  public BookingResponse processDirectRefund(RefundRequest request, String ip) {
    return process(null, request, true, null, ip);
  }

  private BookingResponse process(
      Long id, RefundRequest direct, boolean approved, String note, String ip) {
    Decision decision = transaction().execute(status -> prepare(id, direct, approved, note, ip));
    if (decision.action() == GatewayAction.RETURN_EXISTING) return decision.response();
    // The claim transaction must commit before any gateway I/O.
    VnpayRefundGateway.Result result;
    try {
      result =
          switch (decision.action()) {
            case SUBMIT -> gateway.refund(decision.order());
            case QUERY -> gateway.query(decision.order());
            case RETURN_EXISTING ->
                throw new IllegalStateException("No gateway operation required");
          };
    } catch (RuntimeException unknown) {
      result = VnpayRefundGateway.Result.unknown();
    }
    VnpayRefundGateway.Result outcome =
        result == null ? VnpayRefundGateway.Result.unknown() : result;
    return transaction().execute(status -> finish(decision.order(), outcome));
  }

  private Decision prepare(
      Long id, RefundRequest direct, boolean approved, String note, String ip) {
    // OSIV can reuse a persistence context across transactions in the same HTTP request.
    entityManager.clear();
    User operator = currentOperator();
    Booking booking = direct == null ? locked(id) : lockedReference(direct.getOrderId());
    requireAccess(booking, operator);
    Payment payment = booking.getPayment();
    if (payment == null) throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    if (direct != null
        && (payment.getPaymentMethod() != PaymentMethod.VNPAY
            || !"02".equals(direct.getTrantype())
            || direct.getAmount() == null
            || payment.getAmount() == null
            || BigDecimal.valueOf(direct.getAmount()).compareTo(payment.getAmount()) != 0)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }
    if (approved && booking.getStatus() == BookingStatus.REFUNDED) return done(booking);
    if (booking.getStatus() != BookingStatus.REFUND_REQUESTED) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    }
    boolean unresolved =
        payment.getRefundGatewayStatus() == RefundGatewayStatus.PROCESSING
            || payment.getRefundGatewayStatus() == RefundGatewayStatus.UNKNOWN;
    if (!approved) {
      if (unresolved) throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
      booking.setStatus(BookingStatus.COMPLETED);
      payment.setRefundReason(null);
      payment.setRefundAmount(BigDecimal.ZERO);
      recordOperator(payment, operator, note);
      audit.record(
          AuditAction.REFUND_REJECTED,
          "Booking",
          id,
          "Refund rejected for " + booking.getBookingCode());
      bookings.save(booking);
      return done(booking);
    }
    refundPolicy.requireCanApprove(booking);
    if (payment.getPaymentMethod() == PaymentMethod.CASH) {
      recordOperator(payment, operator, note);
      complete(booking);
      return done(booking);
    }
    if (payment.getPaymentMethod() != PaymentMethod.VNPAY
        || payment.getPaymentCreatedAt() == null
        || payment.getPaidAt() == null
        || payment.getProviderTxnId() == null
        || payment.getProviderTxnId().isBlank()
        || payment.getAmount() == null
        || payment.getAmount().signum() <= 0
        || payment.getAmount().compareTo(booking.getTotalAmount()) != 0) {
      throw new AppException(ErrorCode.INVALID_PAYMENT_STATUS);
    }
    if (payment.getRefundGatewayStatus() == RefundGatewayStatus.PROCESSING
        && payment.getRefundRequestedAt() != null
        && payment
            .getRefundRequestedAt()
            .plusSeconds(GATEWAY_CLAIM_SECONDS)
            .isAfter(LocalDateTime.now(clock))) {
      return done(booking); // Another request owns the bounded gateway call.
    }
    GatewayAction action = unresolved ? GatewayAction.QUERY : GatewayAction.SUBMIT;
    if (action == GatewayAction.SUBMIT) {
      payment.setRefundRequestId(UUID.randomUUID().toString().replace("-", ""));
      payment.setRefundRequestedAt(LocalDateTime.now(clock));
      payment.setRefundGatewayStatus(RefundGatewayStatus.PROCESSING);
      payment.setRefundGatewayCode(null);
      payment.setRefundGatewayMessage("Đang chờ VNPay xác nhận hoàn tiền.");
      recordOperator(payment, operator, note);
      bookings.save(booking);
    }
    if (payment.getRefundRequestId() == null
        || payment.getRefundRequestedAt() == null
        || payment.getRefundProcessedBy() == null) {
      throw new AppException(ErrorCode.INVALID_PAYMENT_STATUS);
    }
    return new Decision(
        action,
        new VnpayRefundGateway.Order(
            booking.getId(),
            payment.getRefundRequestId(),
            payment.getAmount(),
            payment.getProviderTxnId(),
            payment.getPaymentCreatedAt(),
            payment.getRefundRequestedAt(),
            payment.getRefundProcessedBy().getUsername(),
            ip == null ? "127.0.0.1" : ip),
        null);
  }

  private BookingResponse finish(VnpayRefundGateway.Order order, VnpayRefundGateway.Result result) {
    entityManager.clear(); // Re-read the durable attempt under lock, including concurrent updates.
    Booking booking = locked(order.bookingId());
    Payment payment = booking.getPayment();
    if (booking.getStatus() == BookingStatus.REFUNDED) return mapper.toBookingResponse(booking);
    if (!Objects.equals(order.requestId(), payment.getRefundRequestId()))
      return mapper.toBookingResponse(booking);
    if (booking.getStatus() != BookingStatus.REFUND_REQUESTED) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    }
    payment.setRefundGatewayStatus(result.status());
    payment.setRefundGatewayCode(result.code());
    payment.setRefundGatewayMessage(result.message());
    if (result.status() == RefundGatewayStatus.SUCCEEDED) complete(booking);
    else bookings.save(booking);
    return mapper.toBookingResponse(booking);
  }

  private void complete(Booking booking) {
    if (booking.getTickets().stream().anyMatch(ticket -> ticket.getCheckedInAt() != null)) {
      throw new AppException(ErrorCode.BOOKING_CANNOT_REFUND);
    }
    Payment payment = booking.getPayment();
    booking.setStatus(BookingStatus.REFUNDED);
    payment.setPaymentStatus(PaymentStatus.REFUNDED);
    payment.setRefundedAt(LocalDateTime.now(clock));
    payment.setRefundAmount(booking.getTotalAmount());
    booking
        .getTickets()
        .forEach(
            ticket -> {
              ticket.setBooking(null);
              ticket.setTicketStatus(TicketStatus.AVAILABLE);
              ticket.setQrCode(null);
              ticket.setCheckedInAt(null);
              ticket.setCheckedInBy(null);
              tickets.save(ticket);
              BookingTransactionEffects.afterCommit(
                  () ->
                      messaging.convertAndSend(
                          "/topic/showtime/" + booking.getShowtime().getId() + "/seats",
                          SeatStatusEvent.builder()
                              .seatId(ticket.getSeat().getId())
                              .status("AVAILABLE")
                              .build()));
            });
    User customer = booking.getUser();
    if (customer != null && customer.getTotalSpending() != null) {
      customer.setTotalSpending(
          customer.getTotalSpending().subtract(booking.getTotalAmount()).max(BigDecimal.ZERO));
      customer.setMembershipTier(MembershipTier.fromSpending(customer.getTotalSpending()));
      users.save(customer);
    }
    audit.record(
        AuditAction.REFUND_APPROVED,
        "Booking",
        booking.getId(),
        "Refund confirmed for " + booking.getBookingCode());
    bookings.save(booking);
  }

  private User currentOperator() {
    User user = currentUserProvider.requireUser(ErrorCode.ACCESS_DENIED);
    bookingAccessPolicy.requireRefundOperator(user, false);
    return user;
  }

  private void requireAccess(Booking booking, User operator) {
    bookingAccessPolicy.requireCanRefund(booking, operator);
  }

  private Booking locked(Long id) {
    return bookings
        .findByIdForUpdate(id)
        .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
  }

  private Booking lockedReference(String reference) {
    try {
      return locked(Long.valueOf(reference));
    } catch (NumberFormatException e) {
      return bookings
          .findByBookingCodeForUpdate(reference)
          .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
    }
  }

  private void recordOperator(Payment payment, User operator, String note) {
    payment.setRefundProcessedBy(operator);
    payment.setRefundProcessedAt(LocalDateTime.now(clock));
    payment.setRefundProcessNote(note == null || note.isBlank() ? null : note.trim());
  }

  private Decision done(Booking booking) {
    return new Decision(GatewayAction.RETURN_EXISTING, null, mapper.toBookingResponse(booking));
  }

  private TransactionTemplate transaction() {
    TransactionTemplate template = new TransactionTemplate(transactionManager);
    template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    return template;
  }
}
