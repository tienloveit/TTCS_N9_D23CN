package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateMovieRequest;
import com.ltweb.backend.dto.request.RateMovieRequest;
import com.ltweb.backend.dto.request.UpdateMovieRequest;
import com.ltweb.backend.dto.response.MovieRatingResponse;
import com.ltweb.backend.dto.response.MovieResponse;
import com.ltweb.backend.dto.response.PageResponse;
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
import com.ltweb.backend.repository.MovieCatalogSpecifications;
import com.ltweb.backend.repository.MovieRatingRepository;
import com.ltweb.backend.repository.MovieRatingStats;
import com.ltweb.backend.repository.MovieRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MovieService {
  /** Trần số phần tử mỗi trang của danh mục phim và danh sách đánh giá. */
  public static final int MAX_PAGE_SIZE = 50;

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
    movies = scopeMoviesForManager(movies);
    return toMovieResponses(movies.stream().filter(this::canViewMovie).toList());
  }

  /**
   * Danh mục phim cho trang khách: lọc, sắp xếp và phân trang trong database. Phim ẩn chỉ ADMIN
   * thấy. Trang đánh số từ 1, kích thước bị kẹp trong [1, {@link #MAX_PAGE_SIZE}].
   */
  @Transactional(readOnly = true)
  public PageResponse<List<MovieResponse>> getCatalog(
      MovieCatalogSpecifications.Filter filter, int page, int size) {
    MovieCatalogSpecifications.Filter scoped =
        new MovieCatalogSpecifications.Filter(
            filter.movieName(),
            filter.status(),
            filter.genreId(),
            filter.ageRating(),
            filter.sort(),
            isAdmin());
    Page<Movie> movies =
        movieRepository.findAll(
            MovieCatalogSpecifications.catalog(scoped), pageRequest(page, size, Sort.unsorted()));
    return toPageResponse(movies, toMovieResponses(withDetails(movies.getContent())));
  }

  @Transactional(readOnly = true)
  public List<MovieResponse> getUpcomingMovies() {
    return toMovieResponses(
        movieRepository.findByStatus(MovieStatus.UPCOMING).stream()
            .filter(this::canViewMovie)
            .toList());
  }

  @Transactional(readOnly = true)
  public List<MovieResponse> getNowShowingMovies() {
    return toMovieResponses(
        movieRepository.findByStatus(MovieStatus.NOW_SHOWING).stream()
            .filter(this::canViewMovie)
            .toList());
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

    MovieRating rating =
        movieRatingRepository
            .findByMovieIdAndUserId(movieId, user.getId())
            .orElseGet(() -> MovieRating.builder().movie(movie).user(user).build());

    rating.setScore(request.getScore());
    rating.setComment(request.getComment());
    movieRatingRepository.save(rating);

    return toMovieRatingResponse(rating);
  }

  /** Đánh giá của một phim, mới nhất trước, phân trang như {@link #getCatalog}. */
  @Transactional(readOnly = true)
  public PageResponse<List<MovieRatingResponse>> getMovieRatings(Long movieId, int page, int size) {
    getMovie(movieId);
    Page<MovieRating> ratings =
        movieRatingRepository.findByMovieId(
            movieId,
            pageRequest(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
    Double average = getAverageRating(movieId);
    long total = ratings.getTotalElements();
    return toPageResponse(
        ratings,
        ratings.getContent().stream()
            .map(rating -> toMovieRatingResponse(rating, average, total))
            .toList());
  }

  @Transactional(readOnly = true)
  public MovieRatingResponse getMyRating(Long movieId) {
    getMovie(movieId);
    User user = getUserCurrent();
    MovieRating rating =
        movieRatingRepository.findByMovieIdAndUserId(movieId, user.getId()).orElse(null);

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
      movie.setDirector(
          name.isEmpty()
              ? null
              : directorRepository
                  .findFirstByNameIgnoreCase(name)
                  .orElseGet(() -> directorRepository.save(Director.builder().name(name).build())));
      return;
    }
    Director director =
        directorRepository
            .findById(directorId)
            .orElseThrow(() -> new AppException(ErrorCode.DIRECTOR_NOT_FOUND));
    movie.setDirector(director);
  }

  private boolean canViewMovie(Movie movie) {
    return !Boolean.FALSE.equals(movie.getIsPublic()) || isAdmin();
  }

  private boolean isAdmin() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    return authentication != null
        && authentication.isAuthenticated()
        && authentication.getAuthorities().stream()
            .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
  }

  private void validateDates(Movie movie) {
    if (movie.getReleaseDate() != null
        && movie.getEndDate() != null
        && movie.getEndDate().isBefore(movie.getReleaseDate())) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }
  }

  private User getUserCurrent() {
    String username =
        Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
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
    Set<Long> movieIdsInBranch = showtimeRepository.findMovieIdsByBranchId(branchId);
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
    Long movieId = rating.getMovie().getId();
    return toMovieRatingResponse(
        rating, getAverageRating(movieId), movieRatingRepository.countByMovieId(movieId));
  }

  private MovieRatingResponse toMovieRatingResponse(
      MovieRating rating, Double averageRating, Long ratingCount) {
    return MovieRatingResponse.builder()
        .movieId(rating.getMovie().getId())
        .userId(rating.getUser().getId())
        .username(rating.getUser().getUsername())
        .score(rating.getScore())
        .comment(rating.getComment())
        .createdAt(rating.getCreatedAt())
        .averageRating(averageRating)
        .ratingCount(ratingCount)
        .build();
  }

  /** Map nhiều phim với một truy vấn điểm đánh giá gộp thay vì hai truy vấn cho mỗi phim. */
  private List<MovieResponse> toMovieResponses(List<Movie> movies) {
    if (movies.isEmpty()) return List.of();
    Map<Long, MovieRatingStats> stats =
        movieRatingRepository
            .findStatsByMovieIds(movies.stream().map(Movie::getId).toList())
            .stream()
            .collect(Collectors.toMap(MovieRatingStats::getMovieId, Function.identity()));
    return movies.stream()
        .map(
            movie -> {
              MovieResponse response = movieMapper.toMovieResponse(movie);
              MovieRatingStats movieStats = stats.get(movie.getId());
              response.setAverageRating(
                  movieStats == null ? 0.0 : roundRating(movieStats.getAverage()));
              response.setRatingCount(movieStats == null ? 0L : movieStats.getTotal());
              return response;
            })
        .toList();
  }

  /**
   * Nạp thể loại và đạo diễn cho các phim của một trang trong một truy vấn. Các entity đã nằm trong
   * persistence context nên thứ tự của trang được giữ nguyên.
   */
  private List<Movie> withDetails(List<Movie> movies) {
    if (!movies.isEmpty()) movieRepository.findByIdIn(movies.stream().map(Movie::getId).toList());
    return movies;
  }

  private static PageRequest pageRequest(int page, int size, Sort sort) {
    return PageRequest.of(Math.max(page, 1) - 1, Math.clamp(size, 1, MAX_PAGE_SIZE), sort);
  }

  private static <T> PageResponse<List<T>> toPageResponse(Page<?> page, List<T> content) {
    return new PageResponse<>(
        content,
        page.getNumber() + 1,
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages());
  }

  private Double getAverageRating(Long movieId) {
    Double averageRating = movieRatingRepository.getAverageScoreByMovieId(movieId);
    return averageRating == null ? 0.0 : roundRating(averageRating);
  }

  private static Double roundRating(Double averageRating) {
    return Math.round(averageRating * 10.0) / 10.0;
  }
}
