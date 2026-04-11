package com.cgvptit.movie.mapper;

import com.cgvptit.movie.dto.request.MovieRequest;
import com.cgvptit.movie.dto.response.MovieResponse;
import com.cgvptit.movie.entity.Movie;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

@Component
public class MovieBeanMapper {

	public Movie toEntity(MovieRequest request) {
		Movie movie = new Movie();
		BeanUtils.copyProperties(request, movie);
		return movie;
	}

	public void copyRequestOntoEntity(MovieRequest request, Movie movie) {
		BeanUtils.copyProperties(request, movie);
	}

	public MovieResponse toResponse(Movie movie) {
		MovieResponse response = new MovieResponse();
		BeanUtils.copyProperties(movie, response);
		return response;
	}
}
