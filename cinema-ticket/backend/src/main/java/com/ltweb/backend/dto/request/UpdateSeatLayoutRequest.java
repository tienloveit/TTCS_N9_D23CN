package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.SeatType;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateSeatLayoutRequest {
    private List<Item> seats;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Item {
        private Long seatId;
        private String rowLabel;
        private Integer seatNumber;
        private SeatType seatType;
        private Boolean isActive;
    }
}
