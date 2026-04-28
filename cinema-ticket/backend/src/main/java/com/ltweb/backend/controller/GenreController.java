package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateGenreRequest;
import com.ltweb.backend.dto.request.UpdateGenreRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.GenreResponse;
import com.ltweb.backend.service.GenreService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/genre")
@RequiredArgsConstructor
public class GenreController {
  private final GenreService genreService;

  @PostMapping
  public ApiResponse<GenreResponse> createGenre(
      @RequestBody @Valid CreateGenreRequest createGenreRequest) {
    ApiResponse<GenreResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Create genre successfully!");
    apiResponse.setResult(genreService.createGenre(createGenreRequest));
    return apiResponse;
  }

  @GetMapping
  public ApiResponse<List<GenreResponse>> getAllGenres() {
    ApiResponse<List<GenreResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(genreService.getAllGenres());
    return apiResponse;
  }

  @GetMapping("/{id}")
  public ApiResponse<GenreResponse> getGenreById(@PathVariable("id") Long id) {
    ApiResponse<GenreResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(genreService.getGenreById(id));
    return apiResponse;
  }

  @PutMapping("/{id}")
  public ApiResponse<GenreResponse> updateGenre(
      @PathVariable("id") Long id, @RequestBody @Valid UpdateGenreRequest updateGenreRequest) {
    ApiResponse<GenreResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Genre has been updated successfully!");
    apiResponse.setResult(genreService.updateGenre(id, updateGenreRequest));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  public ApiResponse<String> deleteGenre(@PathVariable("id") Long id) {
    ApiResponse<String> apiResponse = new ApiResponse<>();
    genreService.deleteGenre(id);
    apiResponse.setMessage("Genre has been deleted successfully!");
    return apiResponse;
  }
}
