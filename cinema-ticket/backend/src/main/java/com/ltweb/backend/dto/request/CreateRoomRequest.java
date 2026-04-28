package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.enums.RoomType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateRoomRequest {
  @NotBlank(message = "Room code is required")
  @Size(max = 50, message = "Room code must be at most 50 characters")
  private String code;

  @NotBlank(message = "Room name is required")
  @Size(max = 255, message = "Room name must be at most 255 characters")
  private String name;

  private RoomType roomType;

  @NotNull(message = "Seat capacity is required")
  @Min(value = 1, message = "Seat capacity must be at least 1")
  private Integer seatCapacity;

  private RoomStatus status;

  @NotNull(message = "Branch id is required")
  private Long branchId;
}
