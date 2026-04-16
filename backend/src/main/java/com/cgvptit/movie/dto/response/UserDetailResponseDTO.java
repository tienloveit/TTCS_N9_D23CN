package com.cgvptit.movie.dto.response;

import com.cgvptit.movie.entity.Booking;
import com.cgvptit.movie.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailResponseDTO {
    private User user;
    private List<Booking> bookingHistory;
}
