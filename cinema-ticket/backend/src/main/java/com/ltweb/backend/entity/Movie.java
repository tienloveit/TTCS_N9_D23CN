package com.ltweb.backend.entity;

import com.ltweb.backend.enums.AgeRating;
import com.ltweb.backend.enums.MovieStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "movies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Movie {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "movie_id")
  private Long id;

  @Column(nullable = false, name = "movie_name")
  private String movieName;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "thumbnail_url")
  private String thumbnailUrl;

  @Column(name = "trailer_url")
  private String trailerUrl;

  private Integer durationMinutes;

  @Enumerated(EnumType.STRING)
  private AgeRating ageRating;

  private String language;

  private String subtitle;

  private LocalDate releaseDate;

  private LocalDate endDate;

  @Enumerated(EnumType.STRING)
  private MovieStatus status;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "director_id")
  private Director director;

  @ManyToMany
  @JoinTable(
      name = "movie_genres",
      joinColumns = @JoinColumn(name = "movie_id"),
      inverseJoinColumns = @JoinColumn(name = "genre_id"))
  @Builder.Default
  private Set<Genre> genres = new HashSet<>();
}
