package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Genre;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.MovieRating;
import com.ltweb.backend.enums.AgeRating;
import com.ltweb.backend.enums.MovieCatalogSort;
import com.ltweb.backend.enums.MovieStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * Lọc và sắp xếp danh mục phim ngay trong database để phân trang đúng. Thứ tự đặt trong
 * Specification nên Pageable truyền vào phải không có Sort; Spring Data bỏ ORDER BY này khỏi truy
 * vấn đếm.
 */
public final class MovieCatalogSpecifications {
  private static final char LIKE_ESCAPE = '!';

  private MovieCatalogSpecifications() {}

  public record Filter(
      String movieName,
      MovieStatus status,
      Long genreId,
      AgeRating ageRating,
      MovieCatalogSort sort,
      boolean includeHidden) {}

  public static Specification<Movie> catalog(Filter filter) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (!filter.includeHidden()) predicates.add(cb.isTrue(root.get("isPublic")));
      if (filter.movieName() != null && !filter.movieName().isBlank()) {
        predicates.add(
            cb.like(
                cb.lower(root.get("movieName")), containsPattern(filter.movieName()), LIKE_ESCAPE));
      }
      if (filter.status() != null) predicates.add(cb.equal(root.get("status"), filter.status()));
      if (filter.ageRating() != null) {
        predicates.add(cb.equal(root.get("ageRating"), filter.ageRating()));
      }
      if (filter.genreId() != null) predicates.add(hasGenre(root, query, cb, filter.genreId()));
      if (!isCountQuery(query)) query.orderBy(order(root, query, cb, filter.sort()));
      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }

  private static Predicate hasGenre(
      Root<Movie> root, CriteriaQuery<?> query, CriteriaBuilder cb, Long genreId) {
    Subquery<Long> withGenre = query.subquery(Long.class);
    Root<Movie> movie = withGenre.from(Movie.class);
    Join<Movie, Genre> genre = movie.join("genres");
    withGenre
        .select(movie.get("id"))
        .where(cb.equal(movie.get("id"), root.get("id")), cb.equal(genre.get("id"), genreId));
    return cb.exists(withGenre);
  }

  private static List<Order> order(
      Root<Movie> root, CriteriaQuery<?> query, CriteriaBuilder cb, MovieCatalogSort sort) {
    Order byId = cb.asc(root.get("id"));
    return switch (sort == null ? MovieCatalogSort.DEFAULT : sort) {
      case DEFAULT -> List.of(byId);
      case NEWEST -> List.of(cb.desc(root.get("releaseDate")), byId);
      case DURATION -> List.of(cb.desc(root.get("durationMinutes")), byId);
      case RATING -> {
        Subquery<Double> average = query.subquery(Double.class);
        Root<MovieRating> rating = average.from(MovieRating.class);
        average
            .select(cb.coalesce(cb.avg(rating.get("score")), 0.0))
            .where(cb.equal(rating.get("movie").get("id"), root.get("id")));
        yield List.of(cb.desc(average), byId);
      }
    };
  }

  private static boolean isCountQuery(CriteriaQuery<?> query) {
    Class<?> type = query.getResultType();
    return Long.class.equals(type) || long.class.equals(type);
  }

  /** Từ khóa chứa {@code %} hay {@code _} được hiểu đúng nghĩa đen, không thành ký tự đại diện. */
  private static String containsPattern(String keyword) {
    String escaped =
        keyword
            .trim()
            .toLowerCase(Locale.ROOT)
            .replace(LIKE_ESCAPE + "", LIKE_ESCAPE + "" + LIKE_ESCAPE)
            .replace("%", LIKE_ESCAPE + "%")
            .replace("_", LIKE_ESCAPE + "_");
    return "%" + escaped + "%";
  }
}
