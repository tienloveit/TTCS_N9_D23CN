package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.response.BookingFoodResponse;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.dto.response.TicketResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-28T17:37:20+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class BookingMapperImpl implements BookingMapper {

    @Autowired
    private TicketMapper ticketMapper;

    @Override
    public BookingResponse toBookingResponse(Booking booking) {
        if ( booking == null ) {
            return null;
        }

        BookingResponse.BookingResponseBuilder bookingResponse = BookingResponse.builder();

        bookingResponse.userId( bookingUserId( booking ) );
        bookingResponse.username( bookingUserUsername( booking ) );
        bookingResponse.showtimeId( bookingShowtimeId( booking ) );
        bookingResponse.movieName( bookingShowtimeMovieMovieName( booking ) );
        bookingResponse.movieThumbnailUrl( bookingShowtimeMovieThumbnailUrl( booking ) );
        bookingResponse.roomName( bookingShowtimeRoomName( booking ) );
        bookingResponse.branchName( bookingShowtimeRoomBranchName( booking ) );
        bookingResponse.showtimeStart( bookingShowtimeStartTime( booking ) );
        bookingResponse.showtimeEnd( bookingShowtimeEndTime( booking ) );
        bookingResponse.seatCodes( ticketListToStringList( booking.getTickets() ) );
        bookingResponse.bookingId( booking.getId() );
        bookingResponse.foods( bookingFoodListToBookingFoodResponseList( booking.getBookingFoods() ) );
        bookingResponse.bookingCode( booking.getBookingCode() );
        bookingResponse.createdAt( booking.getCreatedAt() );
        bookingResponse.expiresAt( booking.getExpiresAt() );
        bookingResponse.paidAt( booking.getPaidAt() );
        bookingResponse.paymentCreatedAt( booking.getPaymentCreatedAt() );
        bookingResponse.paymentMethod( booking.getPaymentMethod() );
        bookingResponse.paymentStatus( booking.getPaymentStatus() );
        bookingResponse.providerTxnId( booking.getProviderTxnId() );
        bookingResponse.status( booking.getStatus() );
        bookingResponse.tickets( ticketListToTicketResponseList( booking.getTickets() ) );
        bookingResponse.totalAmount( booking.getTotalAmount() );
        bookingResponse.updatedAt( booking.getUpdatedAt() );

        return bookingResponse.build();
    }

    private Long bookingUserId(Booking booking) {
        if ( booking == null ) {
            return null;
        }
        User user = booking.getUser();
        if ( user == null ) {
            return null;
        }
        Long id = user.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }

    private String bookingUserUsername(Booking booking) {
        if ( booking == null ) {
            return null;
        }
        User user = booking.getUser();
        if ( user == null ) {
            return null;
        }
        String username = user.getUsername();
        if ( username == null ) {
            return null;
        }
        return username;
    }

    private Long bookingShowtimeId(Booking booking) {
        if ( booking == null ) {
            return null;
        }
        Showtime showtime = booking.getShowtime();
        if ( showtime == null ) {
            return null;
        }
        Long id = showtime.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }

    private String bookingShowtimeMovieMovieName(Booking booking) {
        if ( booking == null ) {
            return null;
        }
        Showtime showtime = booking.getShowtime();
        if ( showtime == null ) {
            return null;
        }
        Movie movie = showtime.getMovie();
        if ( movie == null ) {
            return null;
        }
        String movieName = movie.getMovieName();
        if ( movieName == null ) {
            return null;
        }
        return movieName;
    }

    private String bookingShowtimeMovieThumbnailUrl(Booking booking) {
        if ( booking == null ) {
            return null;
        }
        Showtime showtime = booking.getShowtime();
        if ( showtime == null ) {
            return null;
        }
        Movie movie = showtime.getMovie();
        if ( movie == null ) {
            return null;
        }
        String thumbnailUrl = movie.getThumbnailUrl();
        if ( thumbnailUrl == null ) {
            return null;
        }
        return thumbnailUrl;
    }

    private String bookingShowtimeRoomName(Booking booking) {
        if ( booking == null ) {
            return null;
        }
        Showtime showtime = booking.getShowtime();
        if ( showtime == null ) {
            return null;
        }
        Room room = showtime.getRoom();
        if ( room == null ) {
            return null;
        }
        String name = room.getName();
        if ( name == null ) {
            return null;
        }
        return name;
    }

    private String bookingShowtimeRoomBranchName(Booking booking) {
        if ( booking == null ) {
            return null;
        }
        Showtime showtime = booking.getShowtime();
        if ( showtime == null ) {
            return null;
        }
        Room room = showtime.getRoom();
        if ( room == null ) {
            return null;
        }
        Branch branch = room.getBranch();
        if ( branch == null ) {
            return null;
        }
        String name = branch.getName();
        if ( name == null ) {
            return null;
        }
        return name;
    }

    private LocalDateTime bookingShowtimeStartTime(Booking booking) {
        if ( booking == null ) {
            return null;
        }
        Showtime showtime = booking.getShowtime();
        if ( showtime == null ) {
            return null;
        }
        LocalDateTime startTime = showtime.getStartTime();
        if ( startTime == null ) {
            return null;
        }
        return startTime;
    }

    private LocalDateTime bookingShowtimeEndTime(Booking booking) {
        if ( booking == null ) {
            return null;
        }
        Showtime showtime = booking.getShowtime();
        if ( showtime == null ) {
            return null;
        }
        LocalDateTime endTime = showtime.getEndTime();
        if ( endTime == null ) {
            return null;
        }
        return endTime;
    }

    protected List<String> ticketListToStringList(List<Ticket> list) {
        if ( list == null ) {
            return null;
        }

        List<String> list1 = new ArrayList<String>( list.size() );
        for ( Ticket ticket : list ) {
            list1.add( ticketToSeatCode( ticket ) );
        }

        return list1;
    }

    protected List<BookingFoodResponse> bookingFoodListToBookingFoodResponseList(List<BookingFood> list) {
        if ( list == null ) {
            return null;
        }

        List<BookingFoodResponse> list1 = new ArrayList<BookingFoodResponse>( list.size() );
        for ( BookingFood bookingFood : list ) {
            list1.add( bookingFoodToResponse( bookingFood ) );
        }

        return list1;
    }

    protected List<TicketResponse> ticketListToTicketResponseList(List<Ticket> list) {
        if ( list == null ) {
            return null;
        }

        List<TicketResponse> list1 = new ArrayList<TicketResponse>( list.size() );
        for ( Ticket ticket : list ) {
            list1.add( ticketMapper.toTicketResponse( ticket ) );
        }

        return list1;
    }
}
