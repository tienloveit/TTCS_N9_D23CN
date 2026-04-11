package com.cgvptit.movie.controller.admin;

import com.cgvptit.movie.dto.request.MovieRequest;
import com.cgvptit.movie.dto.response.MovieResponse;
import com.cgvptit.movie.mapper.MovieBeanMapper;
import com.cgvptit.movie.service.MovieService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping(path = "/api/admin/movies", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminMovieController {

	private final MovieService movieService;
	private final MovieBeanMapper movieBeanMapper;

	public AdminMovieController(MovieService movieService, MovieBeanMapper movieBeanMapper) {
		this.movieService = movieService;
		this.movieBeanMapper = movieBeanMapper;
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<MovieResponse> create(@Valid @RequestBody MovieRequest request) {
		var created = movieService.create(request);
		URI location = ServletUriComponentsBuilder
				.fromCurrentContextPath()
				.path("/api/movies/{id}")
				.buildAndExpand(created.getId())
				.toUri();
		return ResponseEntity.created(location).body(movieBeanMapper.toResponse(created));
	}

	@PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<MovieResponse> update(@PathVariable Integer id, @Valid @RequestBody MovieRequest request) {
		return ResponseEntity.ok(movieBeanMapper.toResponse(movieService.update(id, request)));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Integer id) {
		movieService.delete(id);
		return ResponseEntity.noContent().build();
	}
}
