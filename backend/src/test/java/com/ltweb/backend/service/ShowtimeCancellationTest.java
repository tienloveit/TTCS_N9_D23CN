package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.UpdateShowtimeRequest;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Payment;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.enums.ShowtimeStatus;
import com.ltweb.backend.mapper.ShowtimeMapperImpl;
import com.ltweb.backend.repository.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ShowtimeCancellationTest {
  ShowtimeRepository showtimes = mock(ShowtimeRepository.class);
  BookingRepository bookings = mock(BookingRepository.class);
  BookingReleaseService releaser = mock(BookingReleaseService.class);
  Showtime showtime =
      Showtime.builder()
          .id(7L)
          .status(ShowtimeStatus.OPEN)
          .ticketPrice(new BigDecimal("90000"))
          .room(Room.builder().id(2L).status(RoomStatus.ACTIVE).build())
          .build();

  ShowtimeService service =
      new ShowtimeService(
          BackendServiceFixtures.CLOCK,
          showtimes,
          mock(RoomRepository.class),
          mock(MovieRepository.class),
          bookings,
          mock(TicketRepository.class),
          mock(UserRepository.class),
          new ShowtimeMapperImpl(),
          mock(TicketService.class),
          releaser);

  ShowtimeCancellationTest() {
    when(showtimes.findById(7L)).thenReturn(Optional.of(showtime));
    when(showtimes.save(showtime)).thenReturn(showtime);
  }

  @Test
  void cancellingShowtimeCancelsPendingBookingsAndReturnsTheirResources() {
    Booking pending = booking(1L, PaymentStatus.PENDING);
    when(bookings.findPendingByShowtimeIdForUpdate(7L)).thenReturn(List.of(pending));

    service.update(7L, UpdateShowtimeRequest.builder().status(ShowtimeStatus.CANCELLED).build());

    assertThat(pending.getStatus()).isEqualTo(BookingStatus.CANCELLED);
    assertThat(pending.getPayment().getPaymentStatus()).isEqualTo(PaymentStatus.CANCELLED);
    verify(releaser).releaseUnpaid(pending);
    verify(bookings).save(pending);
  }

  @Test
  void bookingWhosePaymentIsNoLongerPendingIsLeftForTheCallbackToResolve() {
    Booking paidButNotYetCompleted = booking(2L, PaymentStatus.PAID);
    when(bookings.findPendingByShowtimeIdForUpdate(7L)).thenReturn(List.of(paidButNotYetCompleted));

    service.update(7L, UpdateShowtimeRequest.builder().status(ShowtimeStatus.CANCELLED).build());

    assertThat(paidButNotYetCompleted.getStatus()).isEqualTo(BookingStatus.PENDING);
    verifyNoInteractions(releaser);
  }

  @Test
  void otherUpdatesAndRepeatedCancellationDoNotTouchBookings() {
    service.update(7L, UpdateShowtimeRequest.builder().status(ShowtimeStatus.CLOSED).build());
    showtime.setStatus(ShowtimeStatus.CANCELLED);
    service.update(7L, UpdateShowtimeRequest.builder().status(ShowtimeStatus.CANCELLED).build());

    verify(bookings, never()).findPendingByShowtimeIdForUpdate(any());
    verifyNoInteractions(releaser);
  }

  private static Booking booking(Long id, PaymentStatus paymentStatus) {
    Booking booking =
        Booking.builder().id(id).bookingCode("BK-" + id).status(BookingStatus.PENDING).build();
    Payment payment = booking.getPayment();
    payment.setPaymentStatus(paymentStatus);
    return booking;
  }
}
