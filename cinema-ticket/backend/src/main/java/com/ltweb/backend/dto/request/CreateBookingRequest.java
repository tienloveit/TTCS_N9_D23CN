package com.ltweb.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookingRequest {

  @NotNull(message = "Showtime ID is required")
  private Long showtimeId;

  @NotEmpty(message = "At least one seat ID is required")
  private List<Long> seatIds;

  @Valid private List<CreateBookingFoodRequest> foods = new ArrayList<>();
}
