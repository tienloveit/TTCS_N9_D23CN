package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.ShowtimeStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ShowtimeResponse {
  private Long showtimeId;
  private Long roomId;
  private String roomName;
  private String roomType;
  private String branchName;
  private Long branchId;
  private Long movieId;
  private String movieName;
  private LocalDateTime startTime;
  private LocalDateTime endTime;
  private ShowtimeStatus status;
}
