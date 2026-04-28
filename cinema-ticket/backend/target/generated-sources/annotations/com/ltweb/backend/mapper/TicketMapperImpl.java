package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.UpdateTicketRequest;
import com.ltweb.backend.dto.response.TicketResponse;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-28T17:37:20+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class TicketMapperImpl implements TicketMapper {

    @Override
    public TicketResponse toTicketResponse(Ticket ticket) {
        if ( ticket == null ) {
            return null;
        }

        TicketResponse.TicketResponseBuilder ticketResponse = TicketResponse.builder();

        ticketResponse.displayStatus( ticket.getTicketStatus() );
        ticketResponse.seatCode( ticketSeatSeatCode( ticket ) );
        ticketResponse.seatId( ticketSeatId( ticket ) );
        ticketResponse.rowLabel( ticketSeatRowLabel( ticket ) );
        ticketResponse.seatNumber( ticketSeatSeatNumber( ticket ) );
        ticketResponse.showtimeId( ticketShowtimeId( ticket ) );
        ticketResponse.checkedInAt( ticket.getCheckedInAt() );
        ticketResponse.id( ticket.getId() );
        ticketResponse.price( ticket.getPrice() );
        ticketResponse.qrCode( ticket.getQrCode() );
        ticketResponse.ticketStatus( ticket.getTicketStatus() );

        return ticketResponse.build();
    }

    @Override
    public void updateTicket(Ticket ticket, UpdateTicketRequest request) {
        if ( request == null ) {
            return;
        }

        if ( request.getPrice() != null ) {
            ticket.setPrice( request.getPrice() );
        }
        if ( request.getQrCode() != null ) {
            ticket.setQrCode( request.getQrCode() );
        }
        if ( request.getTicketStatus() != null ) {
            ticket.setTicketStatus( request.getTicketStatus() );
        }
    }

    private String ticketSeatSeatCode(Ticket ticket) {
        if ( ticket == null ) {
            return null;
        }
        Seat seat = ticket.getSeat();
        if ( seat == null ) {
            return null;
        }
        String seatCode = seat.getSeatCode();
        if ( seatCode == null ) {
            return null;
        }
        return seatCode;
    }

    private Long ticketSeatId(Ticket ticket) {
        if ( ticket == null ) {
            return null;
        }
        Seat seat = ticket.getSeat();
        if ( seat == null ) {
            return null;
        }
        Long id = seat.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }

    private String ticketSeatRowLabel(Ticket ticket) {
        if ( ticket == null ) {
            return null;
        }
        Seat seat = ticket.getSeat();
        if ( seat == null ) {
            return null;
        }
        String rowLabel = seat.getRowLabel();
        if ( rowLabel == null ) {
            return null;
        }
        return rowLabel;
    }

    private Integer ticketSeatSeatNumber(Ticket ticket) {
        if ( ticket == null ) {
            return null;
        }
        Seat seat = ticket.getSeat();
        if ( seat == null ) {
            return null;
        }
        Integer seatNumber = seat.getSeatNumber();
        if ( seatNumber == null ) {
            return null;
        }
        return seatNumber;
    }

    private Long ticketShowtimeId(Ticket ticket) {
        if ( ticket == null ) {
            return null;
        }
        Showtime showtime = ticket.getShowtime();
        if ( showtime == null ) {
            return null;
        }
        Long id = showtime.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }
}
