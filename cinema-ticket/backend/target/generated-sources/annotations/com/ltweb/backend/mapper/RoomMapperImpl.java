package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateRoomRequest;
import com.ltweb.backend.dto.request.UpdateRoomRequest;
import com.ltweb.backend.dto.response.RoomResponse;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Room;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-28T17:37:20+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class RoomMapperImpl implements RoomMapper {

    @Override
    public Room toRoomEntity(CreateRoomRequest request) {
        if ( request == null ) {
            return null;
        }

        Room.RoomBuilder room = Room.builder();

        room.code( request.getCode() );
        room.name( request.getName() );
        room.roomType( request.getRoomType() );
        room.seatCapacity( request.getSeatCapacity() );
        room.status( request.getStatus() );

        return room.build();
    }

    @Override
    public RoomResponse toRoomResponse(Room room) {
        if ( room == null ) {
            return null;
        }

        RoomResponse.RoomResponseBuilder roomResponse = RoomResponse.builder();

        roomResponse.branchId( roomBranchBranchId( room ) );
        roomResponse.code( room.getCode() );
        roomResponse.id( room.getId() );
        roomResponse.name( room.getName() );
        roomResponse.roomType( room.getRoomType() );
        roomResponse.seatCapacity( room.getSeatCapacity() );
        roomResponse.status( room.getStatus() );

        return roomResponse.build();
    }

    @Override
    public void updateRoom(Room room, UpdateRoomRequest request) {
        if ( request == null ) {
            return;
        }

        if ( request.getCode() != null ) {
            room.setCode( request.getCode() );
        }
        if ( request.getName() != null ) {
            room.setName( request.getName() );
        }
        if ( request.getRoomType() != null ) {
            room.setRoomType( request.getRoomType() );
        }
        if ( request.getSeatCapacity() != null ) {
            room.setSeatCapacity( request.getSeatCapacity() );
        }
        if ( request.getStatus() != null ) {
            room.setStatus( request.getStatus() );
        }
    }

    private Long roomBranchBranchId(Room room) {
        if ( room == null ) {
            return null;
        }
        Branch branch = room.getBranch();
        if ( branch == null ) {
            return null;
        }
        Long branchId = branch.getBranchId();
        if ( branchId == null ) {
            return null;
        }
        return branchId;
    }
}
