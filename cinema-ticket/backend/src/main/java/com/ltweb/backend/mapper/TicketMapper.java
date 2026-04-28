package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.UpdateTicketRequest;
import com.ltweb.backend.dto.response.TicketResponse;
import com.ltweb.backend.entity.Ticket;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface TicketMapper {

  @Mapping(target = "displayStatus", source = "ticketStatus")
  @Mapping(target = "seatCode", source = "seat.seatCode")
  @Mapping(target = "seatId", source = "seat.id")
  @Mapping(target = "rowLabel", source = "seat.rowLabel")
  @Mapping(target = "seatNumber", source = "seat.seatNumber")
  @Mapping(target = "showtimeId", source = "showtime.id")
  @Mapping(target = "bookingId", ignore = true)
  TicketResponse toTicketResponse(Ticket ticket);

  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  @Mapping(target = "booking", ignore = true)
  @Mapping(target = "showtime", ignore = true)
  @Mapping(target = "seat", ignore = true)
  @Mapping(target = "id", ignore = true)
  void updateTicket(@MappingTarget Ticket ticket, UpdateTicketRequest request);
}
