package com.ltweb.backend.service;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.event.BookingPaidEvent;
import com.ltweb.backend.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingTicketEmailListener {

  private final BookingRepository bookingRepository;
  private final EmailService emailService;

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
  public void sendTicketEmail(BookingPaidEvent event) {
    try {
      Booking booking =
          bookingRepository
              .findById(event.bookingId())
              .orElseThrow(
                  () -> new IllegalStateException("Booking not found: " + event.bookingId()));
      emailService.sendBookingTickets(booking);
      log.info("Sent ticket email for booking {}", event.bookingId());
    } catch (Exception ex) {
      log.error(
          "Could not send ticket email for booking {}: {}", event.bookingId(), ex.getMessage(), ex);
    }
  }
}
