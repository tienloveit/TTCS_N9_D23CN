package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateMovieRequest;
import com.ltweb.backend.dto.request.RateMovieRequest;
import com.ltweb.backend.dto.request.UpdateMovieRequest;
import com.ltweb.backend.dto.response.MovieRatingResponse;
import com.ltweb.backend.dto.response.MovieResponse;
import com.ltweb.backend.entity.Director;
import com.ltweb.backend.entity.Genre;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.MovieRating;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.MovieStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.MovieMapper;
import com.ltweb.backend.repository.DirectorRepository;
import com.ltweb.backend.repository.GenreRepository;
import com.ltweb.backend.repository.MovieRatingRepository;
import com.ltweb.backend.repository.MovieRepository;
import com.ltweb.backend.repository.UserRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MovieService {
    private final MovieRepository movieRepository;
    private final GenreRepository genreRepository;
    private final DirectorRepository directorRepository;
    private final MovieRatingRepository movieRatingRepository;
    private final UserRepository userRepository;
    private final ShowtimeRepository showtimeRepository;
    private final MovieMapper movieMapper;

    @Transactional
    public MovieResponse createMovie(CreateMovieRequest createMovieRequest) {
        Movie movie = movieMapper.toMovie(createMovieRequest);
        setDirector(movie, createMovieRequest.getDirectorId(), createMovieRequest.getDirectorName());
        if (createMovieRequest.getIsPublic() == null) movie.setIsPublic(false);
        if (movie.getStatus() == null) movie.setStatus(MovieStatus.UPCOMING);
        validateDates(movie);

        if (createMovieRequest.getGenreIds() != null && !createMovieRequest.getGenreIds().isEmpty()) {
            Set<Genre> genres = new HashSet<>(genreRepository.findAllById(createMovieRequest.getGenreIds()));
            movie.setGenres(genres);
        }

        return toMovieResponse(movieRepository.save(movie));
    }

    @Transactional(readOnly = true)
    public List<MovieResponse> getAllMovies(String movieName) {
        List<Movie> movies;
        if (movieName != null && !movieName.isBlank()) {
            movies = movieRepository.findByMovieNameContainingIgnoreCase(movieName);
        } else {
            movies = movieRepository.findAll();
        }
        movies = scopeMoviesForManager(movies);
        return movies.stream().filter(this::canViewMovie).map(this::toMovieResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MovieResponse> getUpcomingMovies() {
        return movieRepository.findByStatus(MovieStatus.UPCOMING).stream()
                .filter(this::canViewMovie)
                .map(this::toMovieResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MovieResponse> getNowShowingMovies() {
        return movieRepository.findByStatus(MovieStatus.NOW_SHOWING).stream()
                .filter(this::canViewMovie)
                .map(this::toMovieResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MovieResponse getMovieById(Long movieId) {
        Movie movie = getMovie(movieId);
        return toMovieResponse(movie);
    }

    @Transactional
    public MovieResponse updateMovie(Long movieId, UpdateMovieRequest request) {
        Movie movie = getMovie(movieId);

        movieMapper.updateMovie(movie, request);
        validateDates(movie);
        if (request.getDirectorId() != null || request.getDirectorName() != null) {
            setDirector(movie, request.getDirectorId(), request.getDirectorName());
        }
        if (request.getGenreIds() != null) {
            Set<Genre> genres = new HashSet<>(genreRepository.findAllById(request.getGenreIds()));
            movie.setGenres(genres);
        }
        return toMovieResponse(movieRepository.save(movie));
    }

    @Transactional
    public void deleteMovie(Long movieId) {
        Movie movie = getMovie(movieId);
        movieRatingRepository.deleteByMovieId(movieId);
        movieRepository.delete(movie);
    }

    @Transactional
    public MovieRatingResponse rateMovie(Long movieId, RateMovieRequest request) {
        Movie movie = getMovie(movieId);
        User user = getUserCurrent();

        MovieRating rating = movieRatingRepository
                .findByMovieIdAndUserId(movieId, user.getId())
                .orElseGet(() -> MovieRating.builder().movie(movie).user(user).build());

        rating.setScore(request.getScore());
        rating.setComment(request.getComment());
        movieRatingRepository.save(rating);

        return toMovieRatingResponse(rating);
    }

    @Transactional(readOnly = true)
    public List<MovieRatingResponse> getMovieRatings(Long movieId) {
        getMovie(movieId);
        return movieRatingRepository.findByMovieIdOrderByCreatedAtDesc(movieId).stream()
                .map(this::toMovieRatingResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MovieRatingResponse getMyRating(Long movieId) {
        getMovie(movieId);
        User user = getUserCurrent();
        MovieRating rating = movieRatingRepository
                .findByMovieIdAndUserId(movieId, user.getId())
                .orElse(null);

        if (rating == null) {
            return MovieRatingResponse.builder()
                    .movieId(movieId)
                    .userId(user.getId())
                    .averageRating(getAverageRating(movieId))
                    .ratingCount(movieRatingRepository.countByMovieId(movieId))
                    .build();
        }
        return toMovieRatingResponse(rating);
    }

    // ===== PRIVATE HELPER =====
    private Movie getMovie(Long movieId) {
        return movieRepository
                .findById(movieId)
                .filter(this::canViewMovie)
                .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));
    }

    private void setDirector(Movie movie, Long directorId, String directorName) {
        if (directorId == null) {
            String name = directorName == null ? "" : directorName.trim();
            if (movie.getDirector() != null && name.equalsIgnoreCase(movie.getDirector().getName())) {
                return;
            }
            movie.setDirector(name.isEmpty() ? null : directorRepository.findFirstByNameIgnoreCase(name)
                    .orElseGet(() -> directorRepository.save(Director.builder().name(name).build())));
            return;
        }
        Director director = directorRepository
                .findById(directorId)
                .orElseThrow(() -> new AppException(ErrorCode.DIRECTOR_NOT_FOUND));
        movie.setDirector(director);
    }

    private boolean canViewMovie(Movie movie) {
        if (!Boolean.FALSE.equals(movie.getIsPublic())) return true;
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private void validateDates(Movie movie) {
        if (movie.getReleaseDate() != null && movie.getEndDate() != null
                && movie.getEndDate().isBefore(movie.getReleaseDate())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
    }

    private User getUserCurrent() {
        String username = Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
        return userRepository
                .findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private List<Movie> scopeMoviesForManager(List<Movie> movies) {
        User currentUser = getCurrentUserOrNull();
        if (currentUser == null || currentUser.getRole() != UserRole.MANAGER) {
            return movies;
        }
        Long branchId = currentUser.getBranchId();
        if (branchId == null) {
            return List.of();
        }
        Set<Long> movieIdsInBranch = showtimeRepository.findAll().stream()
                .filter(
                        showtime -> showtime.getRoom() != null
                                && showtime.getRoom().getBranch() != null
                                && Objects.equals(showtime.getRoom().getBranch().getBranchId(), branchId)
                                && showtime.getMovie() != null)
                .map(showtime -> showtime.getMovie().getId())
                .collect(Collectors.toSet());
        return movies.stream().filter(movie -> movieIdsInBranch.contains(movie.getId())).toList();
    }

    private User getCurrentUserOrNull() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String username = authentication.getName();
        if (username == null || "anonymousUser".equals(username)) {
            return null;
        }
        return userRepository.findByUsername(username).orElse(null);
    }

    private MovieResponse toMovieResponse(Movie movie) {
        MovieResponse response = movieMapper.toMovieResponse(movie);
        response.setAverageRating(getAverageRating(movie.getId()));
        response.setRatingCount(movieRatingRepository.countByMovieId(movie.getId()));
        return response;
    }

    private MovieRatingResponse toMovieRatingResponse(MovieRating rating) {
        return MovieRatingResponse.builder()
                .movieId(rating.getMovie().getId())
                .userId(rating.getUser().getId())
                .username(rating.getUser().getUsername())
                .score(rating.getScore())
                .comment(rating.getComment())
                .createdAt(rating.getCreatedAt())
                .averageRating(getAverageRating(rating.getMovie().getId()))
                .ratingCount(movieRatingRepository.countByMovieId(rating.getMovie().getId()))
                .build();
    }

    private Double getAverageRating(Long movieId) {
        Double averageRating = movieRatingRepository.getAverageScoreByMovieId(movieId);
        if (averageRating == null) {
            return 0.0;
        }
        return Math.round(averageRating * 10.0) / 10.0;
    }
}
