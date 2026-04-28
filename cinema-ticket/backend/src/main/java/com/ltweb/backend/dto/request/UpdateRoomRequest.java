package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.enums.RoomType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
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
public class UpdateRoomRequest {
  @Size(max = 50, message = "Room code must be at most 50 characters")
  private String code;

  @Size(max = 255, message = "Room name must be at most 255 characters")
  private String name;

  private RoomType roomType;

  @Min(value = 1, message = "Seat capacity must be at least 1")
  private Integer seatCapacity;

  private RoomStatus status;
  private Long branchId;
}
