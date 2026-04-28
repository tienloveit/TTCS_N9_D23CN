package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.AgeRating;
import com.ltweb.backend.enums.MovieStatus;
import java.time.LocalDate;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovieResponse {
  private Long movieId;
  private String movieName;
  private String description;
  private Integer durationMinutes;
  private AgeRating ageRating;
  private String language;
  private String subtitle;
  private String thumbnailUrl;
  private String trailerUrl;
  private LocalDate releaseDate;
  private LocalDate endDate;
  private MovieStatus status;
  private Long directorId;
  private String directorName;
  private Set<GenreResponse> genres;
  private Double averageRating;
  private Long ratingCount;
}
