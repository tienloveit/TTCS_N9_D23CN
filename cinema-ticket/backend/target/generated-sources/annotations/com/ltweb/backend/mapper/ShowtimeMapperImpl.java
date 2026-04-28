package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateShowtimeRequest;
import com.ltweb.backend.dto.request.UpdateShowtimeRequest;
import com.ltweb.backend.dto.response.ShowtimeResponse;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Showtime;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-28T17:37:20+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class ShowtimeMapperImpl implements ShowtimeMapper {

    @Override
    public Showtime toShowtime(CreateShowtimeRequest request) {
        if ( request == null ) {
            return null;
        }

        Showtime.ShowtimeBuilder showtime = Showtime.builder();

        showtime.endTime( request.getEndTime() );
        showtime.startTime( request.getStartTime() );
        showtime.status( request.getStatus() );

        return showtime.build();
    }

    @Override
    public void updateShowtime(Showtime showtime, UpdateShowtimeRequest request) {
        if ( request == null ) {
            return;
        }

        if ( request.getEndTime() != null ) {
            showtime.setEndTime( request.getEndTime() );
        }
        if ( request.getStartTime() != null ) {
            showtime.setStartTime( request.getStartTime() );
        }
        if ( request.getStatus() != null ) {
            showtime.setStatus( request.getStatus() );
        }
    }

    @Override
    public ShowtimeResponse toResponse(Showtime showtime) {
        if ( showtime == null ) {
            return null;
        }

        ShowtimeResponse.ShowtimeResponseBuilder showtimeResponse = ShowtimeResponse.builder();

        showtimeResponse.showtimeId( showtime.getId() );
        showtimeResponse.roomId( showtimeRoomId( showtime ) );
        showtimeResponse.roomName( showtimeRoomName( showtime ) );
        showtimeResponse.branchName( showtimeRoomBranchName( showtime ) );
        showtimeResponse.branchId( showtimeRoomBranchBranchId( showtime ) );
        showtimeResponse.movieId( showtimeMovieId( showtime ) );
        showtimeResponse.movieName( showtimeMovieMovieName( showtime ) );
        showtimeResponse.endTime( showtime.getEndTime() );
        showtimeResponse.startTime( showtime.getStartTime() );
        showtimeResponse.status( showtime.getStatus() );

        showtimeResponse.roomType( showtime.getRoom() != null && showtime.getRoom().getRoomType() != null ? showtime.getRoom().getRoomType().name() : null );

        return showtimeResponse.build();
    }

    private Long showtimeRoomId(Showtime showtime) {
        if ( showtime == null ) {
            return null;
        }
        Room room = showtime.getRoom();
        if ( room == null ) {
            return null;
        }
        Long id = room.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }

    private String showtimeRoomName(Showtime showtime) {
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

    private String showtimeRoomBranchName(Showtime showtime) {
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

    private Long showtimeRoomBranchBranchId(Showtime showtime) {
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
        Long branchId = branch.getBranchId();
        if ( branchId == null ) {
            return null;
        }
        return branchId;
    }

    private Long showtimeMovieId(Showtime showtime) {
        if ( showtime == null ) {
            return null;
        }
        Movie movie = showtime.getMovie();
        if ( movie == null ) {
            return null;
        }
        Long id = movie.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }

    private String showtimeMovieMovieName(Showtime showtime) {
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
}
