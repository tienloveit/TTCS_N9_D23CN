package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ltweb.backend.entity.Genre;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.MovieRating;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.AgeRating;
import com.ltweb.backend.enums.MovieCatalogSort;
import com.ltweb.backend.enums.MovieStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.repository.MovieCatalogSpecifications;
import com.ltweb.backend.repository.MovieCatalogSpecifications.Filter;
import com.ltweb.backend.repository.MovieRatingRepository;
import com.ltweb.backend.repository.MovieRatingStats;
import com.ltweb.backend.repository.MovieRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.TestPropertySource;

/** Lọc, sắp xếp và phân trang danh mục phim chạy thật trên H2 (chế độ MySQL). */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:movie_catalog;MODE=MySQL;DB_CLOSE_DELAY=-1",
      "spring.datasource.driver-class-name=org.h2.Driver",
      "spring.datasource.username=sa",
      "spring.datasource.password=",
      "spring.datasource.hikari.connection-init-sql=SELECT 1",
      "spring.flyway.enabled=false",
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
      "spring.jpa.show-sql=false"
    })
class MovieCatalogDatabaseTest {
  @Autowired EntityManager em;
  @Autowired MovieRepository movies;
  @Autowired MovieRatingRepository ratings;

  private Movie dune;
  private Movie duneFivehundred;
  private Movie conan;
  private Movie hidden;
  private Genre scifi;

  @BeforeEach
  void seed() {
    scifi = persist(Genre.builder().name("Khoa học viễn tưởng").build());
    Genre anime = persist(Genre.builder().name("Hoạt hình").build());
    dune = persist(movie("Dune 50%", MovieStatus.NOW_SHOWING, AgeRating.T13, 2026, 155, scifi));
    duneFivehundred =
        persist(movie("Dune 500", MovieStatus.UPCOMING, AgeRating.T16, 2027, 120, scifi));
    conan = persist(movie("Conan", MovieStatus.NOW_SHOWING, AgeRating.P, 2025, 110, anime));
    hidden = movie("Bản nháp", MovieStatus.UPCOMING, AgeRating.P, 2028, 90, anime);
    hidden.setIsPublic(false);
    persist(hidden);

    User an = persist(user("an"));
    User binh = persist(user("binh"));
    persist(MovieRating.builder().movie(conan).user(an).score(5).build());
    persist(MovieRating.builder().movie(conan).user(binh).score(4).build());
    persist(MovieRating.builder().movie(dune).user(an).score(3).build());
    em.flush();
    em.clear();
  }

  @Test
  void hiddenMoviesOnlyShowForAdmins() {
    assertThat(names(catalog(filter(null, null, null, null, MovieCatalogSort.DEFAULT, false))))
        .containsExactly("Dune 50%", "Dune 500", "Conan");
    assertThat(names(catalog(filter(null, null, null, null, MovieCatalogSort.DEFAULT, true))))
        .contains("Bản nháp");
  }

  @Test
  void nameSearchTreatsPercentAndUnderscoreLiterally() {
    assertThat(names(catalog(filter("50%", null, null, null, MovieCatalogSort.DEFAULT, false))))
        .containsExactly("Dune 50%");
    assertThat(names(catalog(filter("DUNE", null, null, null, MovieCatalogSort.DEFAULT, false))))
        .containsExactly("Dune 50%", "Dune 500");
    assertThat(catalog(filter("_", null, null, null, MovieCatalogSort.DEFAULT, false))).isEmpty();
  }

  @Test
  void filtersByStatusGenreAndAgeRatingTogether() {
    Filter nowShowingScifi =
        filter(null, MovieStatus.NOW_SHOWING, scifi.getId(), null, MovieCatalogSort.DEFAULT, false);
    assertThat(names(catalog(nowShowingScifi))).containsExactly("Dune 50%");
    Filter t16 = filter(null, null, null, AgeRating.T16, MovieCatalogSort.DEFAULT, false);
    assertThat(names(catalog(t16))).containsExactly("Dune 500");
  }

  @Test
  void ratingSortPutsUnratedMoviesLastAndPagesInTheDatabase() {
    Filter byRating = filter(null, null, null, null, MovieCatalogSort.RATING, false);

    Page<Movie> first =
        movies.findAll(MovieCatalogSpecifications.catalog(byRating), PageRequest.of(0, 2));
    Page<Movie> second =
        movies.findAll(MovieCatalogSpecifications.catalog(byRating), PageRequest.of(1, 2));

    assertThat(names(first.getContent())).containsExactly("Conan", "Dune 50%");
    assertThat(names(second.getContent())).containsExactly("Dune 500");
    assertThat(first.getTotalElements()).isEqualTo(3);
    assertThat(first.getTotalPages()).isEqualTo(2);
  }

  @Test
  void newestAndDurationSorts() {
    assertThat(names(catalog(filter(null, null, null, null, MovieCatalogSort.NEWEST, false))))
        .containsExactly("Dune 500", "Dune 50%", "Conan");
    assertThat(names(catalog(filter(null, null, null, null, MovieCatalogSort.DURATION, false))))
        .containsExactly("Dune 50%", "Dune 500", "Conan");
  }

  @Test
  void ratingStatsAreReadForManyMoviesInOneQuery() {
    Map<Long, MovieRatingStats> stats =
        ratings
            .findStatsByMovieIds(List.of(dune.getId(), conan.getId(), duneFivehundred.getId()))
            .stream()
            .collect(Collectors.toMap(MovieRatingStats::getMovieId, s -> s));

    assertThat(stats).doesNotContainKey(duneFivehundred.getId());
    assertThat(stats.get(conan.getId()).getAverage()).isEqualTo(4.5);
    assertThat(stats.get(conan.getId()).getTotal()).isEqualTo(2L);
    assertThat(stats.get(dune.getId()).getTotal()).isEqualTo(1L);
  }

  @Test
  void ratingsArePagedWithTheirAuthors() {
    Page<MovieRating> page =
        ratings.findByMovieId(conan.getId(), PageRequest.of(0, 1, Sort.by(Sort.Order.desc("id"))));

    assertThat(page.getTotalElements()).isEqualTo(2);
    assertThat(page.getContent()).hasSize(1);
    assertThat(page.getContent().getFirst().getUser().getUsername()).isEqualTo("binh");
  }

  private List<Movie> catalog(Filter filter) {
    return movies
        .findAll(MovieCatalogSpecifications.catalog(filter), PageRequest.of(0, 20))
        .getContent();
  }

  private static Filter filter(
      String name,
      MovieStatus status,
      Long genreId,
      AgeRating ageRating,
      MovieCatalogSort sort,
      boolean includeHidden) {
    return new Filter(name, status, genreId, ageRating, sort, includeHidden);
  }

  private static List<String> names(List<Movie> list) {
    return list.stream().map(Movie::getMovieName).toList();
  }

  private static Movie movie(
      String name, MovieStatus status, AgeRating age, int year, int minutes, Genre genre) {
    Movie movie =
        Movie.builder()
            .movieName(name)
            .status(status)
            .ageRating(age)
            .releaseDate(LocalDate.of(year, 1, 1))
            .durationMinutes(minutes)
            .build();
    movie.getGenres().add(genre);
    return movie;
  }

  private static User user(String username) {
    return User.builder()
        .username(username)
        .password("x")
        .role(UserRole.USER)
        .status(UserStatus.ACTIVE)
        .build();
  }

  private <T> T persist(T entity) {
    em.persist(entity);
    return entity;
  }
}
