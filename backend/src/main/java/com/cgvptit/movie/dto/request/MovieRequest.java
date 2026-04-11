package com.cgvptit.movie.dto.request;

import com.cgvptit.movie.enums.MovieStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovieRequest {

	@NotBlank
	private String title;

	@NotNull
	@Positive
	private Integer duration;

	private LocalDate releaseDate;
	private String language;
	private Integer ageRating;
	private String posterUrl;
	private String trailerUrl;
	private MovieStatus status;
	private String description;
}
