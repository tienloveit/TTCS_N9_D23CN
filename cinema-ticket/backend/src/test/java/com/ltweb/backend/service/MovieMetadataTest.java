package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import com.ltweb.backend.dto.request.UpdateMovieRequest;
import com.ltweb.backend.entity.Director;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.mapper.MovieMapperImpl;
import com.ltweb.backend.repository.*;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MovieMetadataTest {
    @Mock MovieRepository movieRepository;
    @Mock GenreRepository genreRepository;
    @Mock DirectorRepository directorRepository;
    @Mock MovieRatingRepository movieRatingRepository;
    @Mock UserRepository userRepository;
    @Mock ShowtimeRepository showtimeRepository;
    @Spy MovieMapperImpl movieMapper = new MovieMapperImpl();
    @InjectMocks MovieService service;

    @Test void editingMovieRetainsTimestampsAndExistingDirectorWithDuplicateName() {
        var created=LocalDateTime.of(2026,11,11,10,0);
        var updated=created.plusHours(1);
        var director=Director.builder().id(20L).name("Same name").build();
        var movie=Movie.builder().id(1L).movieName("Original").director(director)
                .createdAt(created).updatedAt(updated).build();
        // No genres are needed for this test; avoid an uninjected generated mapper dependency.
        movie.setGenres(null);
        when(movieRepository.findById(1L)).thenReturn(Optional.of(movie));
        when(movieRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var response=service.updateMovie(1L,UpdateMovieRequest.builder().movieName("Updated")
                .directorName(" Same name ").build());
        assertThat(response.getDirectorId()).isEqualTo(20L);
        assertThat(response.getCreatedAt()).isEqualTo(created);
        assertThat(response.getUpdatedAt()).isEqualTo(updated);
        verify(directorRepository,never()).findFirstByNameIgnoreCase(any());
    }
}
