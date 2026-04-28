package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.service.DataSeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/cleanup")
@RequiredArgsConstructor
public class CleanupController {

  private final JdbcTemplate jdbcTemplate;
  private final DataSeedService dataSeedService;

  @DeleteMapping("/database")
  public ApiResponse<String> cleanupDatabase() {
    jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0");

    String[] tables = {
      "booking_foods",
      "tickets",
      "bookings",
      "showtimes",
      "seats",
      "rooms",
      "branches",
      "movie_ratings",
      "movie_genres",
      "movies",
      "genres",
      "foods",
      "seat_type_prices",
      "users"
    };

    for (String table : tables) {
      try {
        jdbcTemplate.execute("TRUNCATE TABLE " + table);
      } catch (Exception e) {
        // Table might not exist yet
      }
    }

    jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1");

    dataSeedService.seedInitialData();

    return ApiResponse.<String>builder()
        .result("Database cleaned and default seed data re-initialized.")
        .build();
  }
}
