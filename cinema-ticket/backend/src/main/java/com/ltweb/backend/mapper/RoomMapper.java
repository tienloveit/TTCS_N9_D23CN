package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateRoomRequest;
import com.ltweb.backend.dto.request.UpdateRoomRequest;
import com.ltweb.backend.dto.response.RoomResponse;
import com.ltweb.backend.entity.Room;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface RoomMapper {

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "branch", ignore = true)
  Room toRoomEntity(CreateRoomRequest request);

  @Mapping(target = "branchId", source = "branch.branchId")
  RoomResponse toRoomResponse(Room room);

  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "branch", ignore = true)
  void updateRoom(@MappingTarget Room room, UpdateRoomRequest request);
}
