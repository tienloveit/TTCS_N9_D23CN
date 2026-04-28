package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateMovieRequest;
import com.ltweb.backend.dto.request.UpdateMovieRequest;
import com.ltweb.backend.dto.response.GenreResponse;
import com.ltweb.backend.dto.response.MovieResponse;
import com.ltweb.backend.entity.Director;
import com.ltweb.backend.entity.Genre;
import com.ltweb.backend.entity.Movie;
import java.util.LinkedHashSet;
import java.util.Set;
import javax.annotation.processing.Generated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-28T17:37:19+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class MovieMapperImpl implements MovieMapper {

    @Autowired
    private GenreMapper genreMapper;

    @Override
    public Movie toMovie(CreateMovieRequest request) {
        if ( request == null ) {
            return null;
        }

        Movie.MovieBuilder movie = Movie.builder();

        movie.ageRating( request.getAgeRating() );
        movie.description( request.getDescription() );
        movie.durationMinutes( request.getDurationMinutes() );
        movie.endDate( request.getEndDate() );
        movie.language( request.getLanguage() );
        movie.movieName( request.getMovieName() );
        movie.releaseDate( request.getReleaseDate() );
        movie.status( request.getStatus() );
        movie.subtitle( request.getSubtitle() );
        movie.thumbnailUrl( request.getThumbnailUrl() );
        movie.trailerUrl( request.getTrailerUrl() );

        return movie.build();
    }

    @Override
    public MovieResponse toMovieResponse(Movie movie) {
        if ( movie == null ) {
            return null;
        }

        MovieResponse.MovieResponseBuilder movieResponse = MovieResponse.builder();

        movieResponse.movieId( movie.getId() );
        movieResponse.directorId( movieDirectorId( movie ) );
        movieResponse.directorName( movieDirectorName( movie ) );
        movieResponse.ageRating( movie.getAgeRating() );
        movieResponse.description( movie.getDescription() );
        movieResponse.durationMinutes( movie.getDurationMinutes() );
        movieResponse.endDate( movie.getEndDate() );
        movieResponse.genres( genreSetToGenreResponseSet( movie.getGenres() ) );
        movieResponse.language( movie.getLanguage() );
        movieResponse.movieName( movie.getMovieName() );
        movieResponse.releaseDate( movie.getReleaseDate() );
        movieResponse.status( movie.getStatus() );
        movieResponse.subtitle( movie.getSubtitle() );
        movieResponse.thumbnailUrl( movie.getThumbnailUrl() );
        movieResponse.trailerUrl( movie.getTrailerUrl() );

        return movieResponse.build();
    }

    @Override
    public void updateMovie(Movie movie, UpdateMovieRequest request) {
        if ( request == null ) {
            return;
        }

        if ( request.getAgeRating() != null ) {
            movie.setAgeRating( request.getAgeRating() );
        }
        if ( request.getDescription() != null ) {
            movie.setDescription( request.getDescription() );
        }
        if ( request.getDurationMinutes() != null ) {
            movie.setDurationMinutes( request.getDurationMinutes() );
        }
        if ( request.getEndDate() != null ) {
            movie.setEndDate( request.getEndDate() );
        }
        if ( request.getLanguage() != null ) {
            movie.setLanguage( request.getLanguage() );
        }
        if ( request.getMovieName() != null ) {
            movie.setMovieName( request.getMovieName() );
        }
        if ( request.getReleaseDate() != null ) {
            movie.setReleaseDate( request.getReleaseDate() );
        }
        if ( request.getStatus() != null ) {
            movie.setStatus( request.getStatus() );
        }
        if ( request.getSubtitle() != null ) {
            movie.setSubtitle( request.getSubtitle() );
        }
        if ( request.getThumbnailUrl() != null ) {
            movie.setThumbnailUrl( request.getThumbnailUrl() );
        }
        if ( request.getTrailerUrl() != null ) {
            movie.setTrailerUrl( request.getTrailerUrl() );
        }
    }

    private Long movieDirectorId(Movie movie) {
        if ( movie == null ) {
            return null;
        }
        Director director = movie.getDirector();
        if ( director == null ) {
            return null;
        }
        Long id = director.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }

    private String movieDirectorName(Movie movie) {
        if ( movie == null ) {
            return null;
        }
        Director director = movie.getDirector();
        if ( director == null ) {
            return null;
        }
        String name = director.getName();
        if ( name == null ) {
            return null;
        }
        return name;
    }

    protected Set<GenreResponse> genreSetToGenreResponseSet(Set<Genre> set) {
        if ( set == null ) {
            return null;
        }

        Set<GenreResponse> set1 = new LinkedHashSet<GenreResponse>( Math.max( (int) ( set.size() / .75f ) + 1, 16 ) );
        for ( Genre genre : set ) {
            set1.add( genreMapper.toGenreResponse( genre ) );
        }

        return set1;
    }
}
