package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.CreateMovieRequest;
import com.ltweb.backend.dto.request.UpdateMovieRequest;
import com.ltweb.backend.entity.Director;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.enums.MovieStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.mapper.GenreMapperImpl;
import com.ltweb.backend.mapper.MovieMapperImpl;
import com.ltweb.backend.repository.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class MovieEditorTest {
    @Mock MovieRepository movieRepository;
    @Mock GenreRepository genreRepository;
    @Mock DirectorRepository directorRepository;
    @Mock MovieRatingRepository movieRatingRepository;
    @Mock UserRepository userRepository;
    @Mock ShowtimeRepository showtimeRepository;
    @Spy MovieMapperImpl movieMapper = new MovieMapperImpl();
    @InjectMocks MovieService service;

    @BeforeEach void mapper() {
        ReflectionTestUtils.setField(movieMapper, "genreMapper", new GenreMapperImpl());
    }
    @AfterEach void clearAuthentication() { SecurityContextHolder.clearContext(); }

    @Test void createsDraftAndPersistsEditorFieldsThroughMapper() {
        when(movieRepository.save(any())).thenAnswer(invocation -> {
            Movie movie = invocation.getArgument(0); movie.setId(1L); return movie;
        });
        var result = service.createMovie(CreateMovieRequest.builder().movieName("Film")
                .originalTitle("Original").castNames("Actor A, Actor B").bannerUrl("https://example.com/banner.jpg")
                .thumbnailUrl("https://example.com/poster.jpg").durationMinutes(120).build());
        assertThat(result.getOriginalTitle()).isEqualTo("Original");
        assertThat(result.getCastNames()).isEqualTo("Actor A, Actor B");
        assertThat(result.getBannerUrl()).endsWith("banner.jpg");
        assertThat(result.getIsPublic()).isFalse();
        assertThat(result.getStatus()).isEqualTo(MovieStatus.UPCOMING);
        assertThat(result.getDirectorId()).isNull();
    }

    @Test void reusesDirectorByNameAndPublishesMovie() {
        var director = Director.builder().id(3L).name("Director").build();
        when(directorRepository.findFirstByNameIgnoreCase("Director")).thenReturn(Optional.of(director));
        when(movieRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.createMovie(CreateMovieRequest.builder().movieName("Film")
                .directorName(" Director ").isPublic(true).build());
        assertThat(result.getDirectorId()).isEqualTo(3L);
        assertThat(result.getIsPublic()).isTrue();
        verify(directorRepository, never()).save(any());
    }

    @Test void hidesDraftFromPublicListsAndDirectLookup() {
        Movie draft = Movie.builder().id(1L).isPublic(false).status(MovieStatus.UPCOMING).build();
        Movie publicMovie = Movie.builder().id(2L).isPublic(true).build();
        when(movieRepository.findAll()).thenReturn(List.of(draft, publicMovie));
        when(movieRepository.findByStatus(MovieStatus.UPCOMING)).thenReturn(List.of(draft));
        when(movieRepository.findById(1L)).thenReturn(Optional.of(draft));
        assertThat(service.getAllMovies(null)).extracting("movieId").containsExactly(2L);
        assertThat(service.getUpcomingMovies()).isEmpty();
        assertThatThrownBy(() -> service.getMovieById(1L)).isInstanceOf(AppException.class);
    }

    @Test void adminCanReopenDraftAndPublishWithoutChangingScreeningStatus() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        Movie draft = Movie.builder().id(1L).isPublic(false).status(MovieStatus.NOW_SHOWING).build();
        when(movieRepository.findById(1L)).thenReturn(Optional.of(draft));
        when(movieRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var response = service.updateMovie(1L, UpdateMovieRequest.builder().isPublic(true)
                .originalTitle("Updated").castNames("Cast").bannerUrl("").directorName("").genreIds(Set.of()).build());
        assertThat(response.getIsPublic()).isTrue();
        assertThat(response.getOriginalTitle()).isEqualTo("Updated");
        assertThat(response.getBannerUrl()).isEmpty();
        assertThat(response.getStatus()).isEqualTo(MovieStatus.NOW_SHOWING);
    }

    @Test void rejectsEndDateBeforeReleaseDate() {
        assertThatThrownBy(() -> service.createMovie(CreateMovieRequest.builder().movieName("Film")
                .releaseDate(LocalDate.of(2026, 11, 20)).endDate(LocalDate.of(2026, 11, 19)).build()))
                .isInstanceOf(AppException.class);
        verify(movieRepository, never()).save(any());
    }
}
