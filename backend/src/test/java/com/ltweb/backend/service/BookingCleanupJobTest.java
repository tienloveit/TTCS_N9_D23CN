package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.job.BookingCleanupJob;
import com.ltweb.backend.repository.BookingRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

class BookingCleanupJobTest {
  private final BookingRepository bookings = mock(BookingRepository.class);
  private final BookingReleaseService releaser = mock(BookingReleaseService.class);
  private final PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
  private final BookingCleanupJob job =
      new BookingCleanupJob(BackendServiceFixtures.CLOCK, bookings, releaser, transactions);

  @Test
  void eachExpiredBookingIsReleasedInItsOwnTransactionAndFailuresDoNotStopTheRest() {
    when(transactions.getTransaction(any())).thenAnswer(call -> new SimpleTransactionStatus());
    Booking broken = expired(1L);
    Booking healthy = expired(2L);
    Booking paidMeanwhile = expired(3L);
    paidMeanwhile.setStatus(BookingStatus.COMPLETED);
    when(bookings.findExpiredBookingIds(any())).thenReturn(List.of(1L, 2L, 3L));
    doThrow(new IllegalStateException("food row locked")).when(releaser).releaseUnpaid(broken);

    job.releaseExpiredBookings();

    assertThat(healthy.getStatus()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(healthy.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.CANCELLED);
    verify(releaser).releaseUnpaid(healthy);
    verify(releaser, never()).releaseUnpaid(paidMeanwhile);
    assertThat(paidMeanwhile.getStatus()).isEqualTo(BookingStatus.COMPLETED);
    // Mỗi đơn mở một transaction REQUIRES_NEW; đơn lỗi bị rollback, các đơn khác được commit.
    verify(transactions, times(3))
        .getTransaction(
            argThat(
                definition ->
                    definition.getPropagationBehavior()
                        == TransactionDefinition.PROPAGATION_REQUIRES_NEW));
    verify(transactions, times(1)).rollback(any());
    verify(transactions, times(2)).commit(any());
  }

  private Booking expired(Long id) {
    Booking booking =
        Booking.builder()
            .id(id)
            .bookingCode("BK-" + id)
            .status(BookingStatus.PENDING)
            .expiresAt(LocalDateTime.now(BackendServiceFixtures.CLOCK).minusMinutes(1))
            .build();
    booking.getPayment().setPaymentStatus(PaymentStatus.PENDING);
    when(bookings.findByIdForUpdate(id)).thenReturn(Optional.of(booking));
    return booking;
  }
}
