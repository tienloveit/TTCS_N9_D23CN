package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.ltweb.backend.config.DataSeeder;
import com.ltweb.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class DataSeederPrimaryKeyTest {
  @Mock JdbcTemplate jdbcTemplate;

  @Test
  void cleanupJoinsUseNewParentPrimaryKeysAndKeepForeignKeyColumns() {
    DataSeeder seeder =
        new DataSeeder(
            BackendServiceFixtures.CLOCK,
            mock(ShowtimeRepository.class),
            mock(BookingRepository.class),
            mock(TicketRepository.class),
            mock(MovieRepository.class),
            mock(RoomRepository.class),
            mock(SeatRepository.class),
            mock(UserRepository.class),
            mock(FoodRepository.class),
            jdbcTemplate);
    ReflectionTestUtils.invokeMethod(seeder, "cleanOldData");
    var sql = ArgumentCaptor.forClass(String.class);
    verify(jdbcTemplate, times(5)).update(sql.capture(), anyString());
    assertThat(sql.getAllValues())
        .allSatisfy(
            statement -> assertThat(statement).doesNotContain("b.booking_id", "s.showtime_id"));
    assertThat(sql.getAllValues().get(0)).contains("t.booking_id = b.id", "b.showtime_id = s.id");
    assertThat(sql.getAllValues().get(1)).contains("t.showtime_id = s.id");
    assertThat(sql.getAllValues().get(2)).contains("bf.booking_id = b.id", "b.showtime_id = s.id");
  }
}
