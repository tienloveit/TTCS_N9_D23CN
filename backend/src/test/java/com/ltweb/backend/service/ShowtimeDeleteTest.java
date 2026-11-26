package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.ShowtimeMapperImpl;
import com.ltweb.backend.repository.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ShowtimeDeleteTest {
  ShowtimeRepository showtimes = mock(ShowtimeRepository.class);
  BookingRepository bookings = mock(BookingRepository.class);
  TicketRepository tickets = mock(TicketRepository.class);
  Showtime showtime = Showtime.builder().id(7L).build();

  ShowtimeService service =
      new ShowtimeService(
          BackendServiceFixtures.CLOCK,
          showtimes,
          mock(RoomRepository.class),
          mock(MovieRepository.class),
          bookings,
          tickets,
          mock(UserRepository.class),
          new ShowtimeMapperImpl(),
          mock(TicketService.class),
          mock(BookingReleaseService.class));

  @Test
  void showtimeWithAnyBookingIsKeptWithItsTickets() {
    when(showtimes.findById(7L)).thenReturn(Optional.of(showtime));
    when(bookings.existsByShowtimeId(7L)).thenReturn(true);

    assertThatThrownBy(() -> service.delete(7L))
        .isInstanceOfSatisfying(
            AppException.class,
            error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.SHOWTIME_HAS_BOOKINGS));
    verify(tickets, never()).deleteByShowtimeId(any());
    verify(showtimes, never()).delete(any());
  }

  @Test
  void showtimeWithoutBookingsIsDeletedWithItsInventory() {
    when(showtimes.findById(7L)).thenReturn(Optional.of(showtime));
    when(bookings.existsByShowtimeId(7L)).thenReturn(false);

    service.delete(7L);

    var order = inOrder(tickets, showtimes);
    order.verify(tickets).deleteByShowtimeId(7L);
    order.verify(showtimes).delete(showtime);
  }
}
