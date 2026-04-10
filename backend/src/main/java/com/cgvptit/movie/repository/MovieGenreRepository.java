package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.MovieGenre;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovieGenreRepository extends JpaRepository<MovieGenre, Integer> {
}