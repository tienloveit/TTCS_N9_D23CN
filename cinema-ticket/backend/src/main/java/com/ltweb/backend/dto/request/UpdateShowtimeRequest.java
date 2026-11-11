package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.ShowtimeStatus;
import com.ltweb.backend.enums.ScreeningFormat;
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
    @jakarta.validation.constraints.DecimalMin(value = "1", message = "Ticket price must be positive")
    @jakarta.validation.constraints.Digits(integer = 12, fraction = 0, message = "Ticket price must be a whole VND amount")
    private java.math.BigDecimal ticketPrice;

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private ShowtimeStatus status;
    private ScreeningFormat screeningFormat;
}
