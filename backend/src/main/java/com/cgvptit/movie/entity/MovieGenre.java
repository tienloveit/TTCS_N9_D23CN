package com.cgvptit.movie.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(
        name = "movie_genres",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_movie_genres_movie_genre", columnNames = {"movie_id", "genre_id"})
        }
)
@Data
public class MovieGenre {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "genre_id", nullable = false)
    private Genre genre;
}
