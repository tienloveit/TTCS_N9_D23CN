package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.ShowtimeStatus;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateShowtimeRequest {
  @NotNull(message = "Room ID is required")
  private Long roomId;

  @NotNull(message = "Movie ID is required")
  private Long movieId;

  @NotNull(message = "Start time is required")
  @Future(message = "Start time must be in the future")
  private LocalDateTime startTime;

  @NotNull(message = "End time is required")
  @Future(message = "End time must be in the future")
  private LocalDateTime endTime;

  @NotNull(message = "Status is required")
  private ShowtimeStatus status;
}
