package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateSeatRequest;
import com.ltweb.backend.dto.request.UpdateSeatRequest;
import com.ltweb.backend.dto.response.SeatResponse;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Seat;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-28T17:37:20+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class SeatMapperImpl implements SeatMapper {

    @Override
    public Seat toSeat(CreateSeatRequest request) {
        if ( request == null ) {
            return null;
        }

        Seat.SeatBuilder seat = Seat.builder();

        seat.isActive( request.getIsActive() );
        seat.rowLabel( request.getRowLabel() );
        seat.seatCode( request.getSeatCode() );
        seat.seatNumber( request.getSeatNumber() );
        seat.seatType( request.getSeatType() );

        return seat.build();
    }

    @Override
    public void updateSeat(Seat seat, UpdateSeatRequest request) {
        if ( request == null ) {
            return;
        }

        if ( request.getIsActive() != null ) {
            seat.setIsActive( request.getIsActive() );
        }
        if ( request.getRowLabel() != null ) {
            seat.setRowLabel( request.getRowLabel() );
        }
        if ( request.getSeatCode() != null ) {
            seat.setSeatCode( request.getSeatCode() );
        }
        if ( request.getSeatNumber() != null ) {
            seat.setSeatNumber( request.getSeatNumber() );
        }
        if ( request.getSeatType() != null ) {
            seat.setSeatType( request.getSeatType() );
        }
    }

    @Override
    public SeatResponse toSeatResponse(Seat seat) {
        if ( seat == null ) {
            return null;
        }

        SeatResponse.SeatResponseBuilder seatResponse = SeatResponse.builder();

        seatResponse.seatId( seat.getId() );
        seatResponse.roomId( seatRoomId( seat ) );
        seatResponse.isActive( seat.getIsActive() );
        seatResponse.rowLabel( seat.getRowLabel() );
        seatResponse.seatCode( seat.getSeatCode() );
        seatResponse.seatNumber( seat.getSeatNumber() );
        seatResponse.seatType( seat.getSeatType() );

        return seatResponse.build();
    }

    private Long seatRoomId(Seat seat) {
        if ( seat == null ) {
            return null;
        }
        Room room = seat.getRoom();
        if ( room == null ) {
            return null;
        }
        Long id = room.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }
}
