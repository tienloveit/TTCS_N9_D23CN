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
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.MovieMapper;
import com.ltweb.backend.repository.DirectorRepository;
import com.ltweb.backend.repository.GenreRepository;
import com.ltweb.backend.repository.MovieRatingRepository;
import com.ltweb.backend.repository.MovieRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
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
  private final MovieMapper movieMapper;

  @Transactional
  public MovieResponse createMovie(CreateMovieRequest createMovieRequest) {
    Movie movie = movieMapper.toMovie(createMovieRequest);
    setDirector(movie, createMovieRequest.getDirectorId());

    if (createMovieRequest.getGenreIds() != null && !createMovieRequest.getGenreIds().isEmpty()) {
      Set<Genre> genres =
          new HashSet<>(genreRepository.findAllById(createMovieRequest.getGenreIds()));
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
    return movies.stream().map(this::toMovieResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<MovieResponse> getUpcomingMovies() {
    return movieRepository.findByStatus(MovieStatus.UPCOMING).stream()
        .map(this::toMovieResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<MovieResponse> getNowShowingMovies() {
    return movieRepository.findByStatus(MovieStatus.NOW_SHOWING).stream()
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
    if (request.getDirectorId() != null) {
      setDirector(movie, request.getDirectorId());
    }
    if (request.getGenreIds() != null && !request.getGenreIds().isEmpty()) {
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

    MovieRating rating =
        movieRatingRepository
            .findByMovieIdAndUserId(movieId, user.getId())
            .orElseGet(() -> MovieRating.builder().movie(movie).user(user).build());

    rating.setScore(request.getScore());
    movieRatingRepository.save(rating);

    return toMovieRatingResponse(movieId, user.getId(), rating.getScore());
  }

  @Transactional(readOnly = true)
  public MovieRatingResponse getMyRating(Long movieId) {
    getMovie(movieId);
    User user = getUserCurrent();
    Integer score =
        movieRatingRepository
            .findByMovieIdAndUserId(movieId, user.getId())
            .map(MovieRating::getScore)
            .orElse(null);

    return toMovieRatingResponse(movieId, user.getId(), score);
  }

  // ===== PRIVATE HELPER =====
  private Movie getMovie(Long movieId) {
    return movieRepository
        .findById(movieId)
        .orElseThrow(() -> new AppException(ErrorCode.MOVIE_NOT_FOUND));
  }

  private void setDirector(Movie movie, Long directorId) {
    Director director =
        directorRepository
            .findById(directorId)
            .orElseThrow(() -> new AppException(ErrorCode.DIRECTOR_NOT_FOUND));
    movie.setDirector(director);
  }

  private User getUserCurrent() {
    String username =
        Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
    return userRepository
        .findByUsername(username)
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }

  private MovieResponse toMovieResponse(Movie movie) {
    MovieResponse response = movieMapper.toMovieResponse(movie);
    response.setAverageRating(getAverageRating(movie.getId()));
    response.setRatingCount(movieRatingRepository.countByMovieId(movie.getId()));
    return response;
  }

  private MovieRatingResponse toMovieRatingResponse(Long movieId, Long userId, Integer score) {
    return MovieRatingResponse.builder()
        .movieId(movieId)
        .userId(userId)
        .score(score)
        .averageRating(getAverageRating(movieId))
        .ratingCount(movieRatingRepository.countByMovieId(movieId))
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
