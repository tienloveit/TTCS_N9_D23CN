package com.ltweb.backend.service;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.mapper.ShowtimeMapperImpl;
import com.ltweb.backend.repository.*;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;

class ShowtimeBranchScheduleTest {
  @Test
  void scheduleWithoutDateUsesTodayInCinemaTime() {
    // 23:30 ngày 24/11 theo UTC đã là 06:30 ngày 25/11 ở rạp.
    Clock clock = Clock.fixed(Instant.parse("2026-11-24T23:30:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    ShowtimeRepository showtimes = mock(ShowtimeRepository.class);
    when(showtimes.findByBranchAndDate(any(), any(), any())).thenReturn(List.of());
    ShowtimeService service =
        new ShowtimeService(
            clock,
            showtimes,
            mock(RoomRepository.class),
            mock(MovieRepository.class),
            mock(BookingRepository.class),
            mock(TicketRepository.class),
            mock(UserRepository.class),
            new ShowtimeMapperImpl(),
            mock(TicketService.class),
            mock(BookingReleaseService.class));

    service.getByBranch(3L, null);

    LocalDate cinemaToday = LocalDate.of(2026, 11, 25);
    verify(showtimes).findByBranchAndDate(eq(3L), eq(cinemaToday.atStartOfDay()), any());
  }
}
