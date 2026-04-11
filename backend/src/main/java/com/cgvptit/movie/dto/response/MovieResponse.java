package com.cgvptit.movie.dto.response;

import com.cgvptit.movie.enums.MovieStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovieResponse {

	private Integer id;
	private String title;
	private Integer duration;
	private LocalDate releaseDate;
	private String language;
	private Integer ageRating;
	private String posterUrl;
	private String trailerUrl;
	private MovieStatus status;
	private String description;
}
