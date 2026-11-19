package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateSeatRequest;
import com.ltweb.backend.dto.request.UpdateSeatRequest;
import com.ltweb.backend.dto.response.SeatResponse;
import com.ltweb.backend.entity.Seat;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface SeatMapper {

  @Mapping(target = "room", ignore = true)
  @Mapping(target = "id", ignore = true)
  Seat toSeat(CreateSeatRequest request);

  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "room", ignore = true)
  void updateSeat(@MappingTarget Seat seat, UpdateSeatRequest request);

  @Mapping(source = "id", target = "seatId")
  @Mapping(source = "room.id", target = "roomId")
  SeatResponse toSeatResponse(Seat seat);
}
