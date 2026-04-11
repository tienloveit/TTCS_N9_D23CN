package com.cgvptit.movie.service;

import com.cgvptit.movie.dto.request.MovieRequest;
import com.cgvptit.movie.entity.Movie;
import com.cgvptit.movie.mapper.MovieBeanMapper;
import com.cgvptit.movie.repository.MovieRepository;
import com.cgvptit.movie.util.MovieConstants;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class MovieService {

	private final MovieRepository movieRepository;
	private final MovieBeanMapper movieBeanMapper;

	public MovieService(MovieRepository movieRepository, MovieBeanMapper movieBeanMapper) {
		this.movieRepository = movieRepository;
		this.movieBeanMapper = movieBeanMapper;
	}

	public List<Movie> findAll() {
		return movieRepository.findAll();
	}

	public Movie findById(Integer id) {
		return movieRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phim"));
	}

	@Transactional
	public Movie create(MovieRequest request) {
		Movie movie = movieBeanMapper.toEntity(request);
		if (!StringUtils.hasText(movie.getStatus())) {
			movie.setStatus(MovieConstants.DEFAULT_MOVIE_STATUS);
		}
		return movieRepository.save(movie);
	}

	@Transactional
	public Movie update(Integer id, MovieRequest request) {
		Movie movie = findById(id);
		movieBeanMapper.copyRequestOntoEntity(request, movie);
		if (!StringUtils.hasText(movie.getStatus())) {
			movie.setStatus(MovieConstants.DEFAULT_MOVIE_STATUS);
		}
		return movieRepository.save(movie);
	}

	@Transactional
	public void delete(Integer id) {
		if (!movieRepository.existsById(id)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phim");
		}
		movieRepository.deleteById(id);
	}
}
