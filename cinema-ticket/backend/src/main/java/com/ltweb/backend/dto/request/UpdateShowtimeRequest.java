package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.ShowtimeStatus;
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
public class UpdateShowtimeRequest {
  private LocalDateTime startTime;
  private LocalDateTime endTime;
  private ShowtimeStatus status;
}
