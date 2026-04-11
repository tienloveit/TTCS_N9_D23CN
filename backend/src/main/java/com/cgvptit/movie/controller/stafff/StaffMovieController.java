package com.cgvptit.movie.controller.stafff;

import com.cgvptit.movie.dto.response.MovieResponse;
import com.cgvptit.movie.mapper.MovieBeanMapper;
import com.cgvptit.movie.service.MovieService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(path = "/api/staff/movies", produces = MediaType.APPLICATION_JSON_VALUE)
public class StaffMovieController {

	private final MovieService movieService;
	private final MovieBeanMapper movieBeanMapper;

	public StaffMovieController(MovieService movieService, MovieBeanMapper movieBeanMapper) {
		this.movieService = movieService;
		this.movieBeanMapper = movieBeanMapper;
	}

	@GetMapping
	public ResponseEntity<List<MovieResponse>> list() {
		return ResponseEntity.ok(movieService.findAll().stream()
				.map(movieBeanMapper::toResponse)
				.toList());
	}

	@GetMapping("/{id}")
	public ResponseEntity<MovieResponse> get(@PathVariable Integer id) {
		return ResponseEntity.ok(movieBeanMapper.toResponse(movieService.findById(id)));
	}
}
