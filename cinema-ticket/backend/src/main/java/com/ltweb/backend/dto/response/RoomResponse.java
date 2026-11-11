package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.enums.RoomTechnology;
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
public class RoomResponse {
    private Long id;
    private String code;
    private String name;
    private RoomTechnology roomTechnology;
    private Integer seatCapacity;
    private RoomStatus status;
    private Long branchId;
}
