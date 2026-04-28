package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateShowtimeRequest;
import com.ltweb.backend.dto.request.UpdateShowtimeRequest;
import com.ltweb.backend.dto.response.ShowtimeResponse;
import com.ltweb.backend.entity.Showtime;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface ShowtimeMapper {
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "room", ignore = true)
  @Mapping(target = "movie", ignore = true)
  Showtime toShowtime(CreateShowtimeRequest request);

  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "room", ignore = true)
  @Mapping(target = "movie", ignore = true)
  void updateShowtime(@MappingTarget Showtime showtime, UpdateShowtimeRequest request);

  @Mapping(source = "id", target = "showtimeId")
  @Mapping(source = "room.id", target = "roomId")
  @Mapping(source = "room.name", target = "roomName")
  @Mapping(
      expression =
          "java(showtime.getRoom() != null && showtime.getRoom().getRoomType() != null ?"
              + " showtime.getRoom().getRoomType().name() : null)",
      target = "roomType")
  @Mapping(source = "room.branch.name", target = "branchName")
  @Mapping(source = "room.branch.branchId", target = "branchId")
  @Mapping(source = "movie.id", target = "movieId")
  @Mapping(source = "movie.movieName", target = "movieName")
  ShowtimeResponse toResponse(Showtime showtime);
}
