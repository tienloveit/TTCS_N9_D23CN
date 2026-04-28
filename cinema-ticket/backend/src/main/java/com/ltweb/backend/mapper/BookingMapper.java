package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.response.BookingFoodResponse;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Ticket;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = TicketMapper.class)
public interface BookingMapper {

  @Mapping(target = "userId", source = "user.id")
  @Mapping(target = "username", source = "user.username")
  @Mapping(target = "showtimeId", source = "showtime.id")
  @Mapping(target = "movieName", source = "showtime.movie.movieName")
  @Mapping(target = "movieThumbnailUrl", source = "showtime.movie.thumbnailUrl")
  @Mapping(target = "roomName", source = "showtime.room.name")
  @Mapping(target = "branchName", source = "showtime.room.branch.name")
  @Mapping(target = "showtimeStart", source = "showtime.startTime")
  @Mapping(target = "showtimeEnd", source = "showtime.endTime")
  @Mapping(target = "seatCodes", source = "tickets")
  @Mapping(target = "bookingId", source = "id")
  @Mapping(target = "foods", source = "bookingFoods")
  BookingResponse toBookingResponse(Booking booking);

  default String ticketToSeatCode(Ticket ticket) {
    if (ticket == null || ticket.getSeat() == null) {
      return null;
    }
    return ticket.getSeat().getSeatCode();
  }

  default BookingFoodResponse bookingFoodToResponse(BookingFood bookingFood) {
    if (bookingFood == null) {
      return null;
    }

    return BookingFoodResponse.builder()
        .foodId(bookingFood.getFood() == null ? null : bookingFood.getFood().getId())
        .foodName(bookingFood.getFood() == null ? null : bookingFood.getFood().getName())
        .quantity(bookingFood.getQuantity())
        .unitPrice(bookingFood.getUnitPrice())
        .subtotal(bookingFood.getSubtotal())
        .build();
  }
}
