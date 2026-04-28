package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateMovieRequest;
import com.ltweb.backend.dto.request.RateMovieRequest;
import com.ltweb.backend.dto.request.UpdateMovieRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.MovieRatingResponse;
import com.ltweb.backend.dto.response.MovieResponse;
import com.ltweb.backend.service.MovieService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/movie")
@RequiredArgsConstructor
public class MovieController {
  private final MovieService movieService;

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<MovieResponse> createMovie(
      @RequestBody @Valid CreateMovieRequest createMovieRequest) {
    ApiResponse<MovieResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Create movie successfully!");
    apiResponse.setResult(movieService.createMovie(createMovieRequest));
    return apiResponse;
  }

  @GetMapping
  public ApiResponse<List<MovieResponse>> getAllMovies(
      @org.springframework.web.bind.annotation.RequestParam(required = false) String movieName) {
    ApiResponse<List<MovieResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(movieService.getAllMovies(movieName));
    return apiResponse;
  }

  @GetMapping("/upcoming")
  public ApiResponse<List<MovieResponse>> getUpcomingMovies() {
    ApiResponse<List<MovieResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(movieService.getUpcomingMovies());
    return apiResponse;
  }

  @GetMapping("/now-showing")
  public ApiResponse<List<MovieResponse>> getNowShowingMovies() {
    ApiResponse<List<MovieResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(movieService.getNowShowingMovies());
    return apiResponse;
  }

  @GetMapping("/{id}")
  public ApiResponse<MovieResponse> getMovieById(@PathVariable("id") Long id) {
    ApiResponse<MovieResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(movieService.getMovieById(id));
    return apiResponse;
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<MovieResponse> updateMovie(
      @PathVariable("id") Long id, @RequestBody @Valid UpdateMovieRequest updateMovieRequest) {
    ApiResponse<MovieResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Movie has been updated successfully!");
    apiResponse.setResult(movieService.updateMovie(id, updateMovieRequest));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<String> deleteMovie(@PathVariable("id") Long id) {
    ApiResponse<String> apiResponse = new ApiResponse<>();
    movieService.deleteMovie(id);
    apiResponse.setMessage("Movie has been deleted successfully!");
    return apiResponse;
  }

  @PostMapping("/{id}/rating")
  public ApiResponse<MovieRatingResponse> rateMovie(
      @PathVariable("id") Long id, @RequestBody @Valid RateMovieRequest request) {
    ApiResponse<MovieRatingResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Movie rating saved successfully!");
    apiResponse.setResult(movieService.rateMovie(id, request));
    return apiResponse;
  }

  @GetMapping("/{id}/rating/my")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<MovieRatingResponse> getMyRating(@PathVariable("id") Long id) {
    ApiResponse<MovieRatingResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(movieService.getMyRating(id));
    return apiResponse;
  }
}
