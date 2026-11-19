package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateDirectorRequest;
import com.ltweb.backend.dto.request.UpdateDirectorRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.DirectorResponse;
import com.ltweb.backend.service.DirectorService;
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
@RequestMapping("/director")
@RequiredArgsConstructor
public class DirectorController {
  private final DirectorService directorService;

  @GetMapping
  public ApiResponse<List<DirectorResponse>> getAllDirectors() {
    ApiResponse<List<DirectorResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(directorService.getAllDirectors());
    return apiResponse;
  }

  @GetMapping("/{id}")
  public ApiResponse<DirectorResponse> getDirectorById(@PathVariable Long id) {
    ApiResponse<DirectorResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(directorService.getDirectorById(id));
    return apiResponse;
  }

  @PostMapping
  public ApiResponse<DirectorResponse> createDirector(
      @RequestBody @Valid CreateDirectorRequest request) {
    ApiResponse<DirectorResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Create director successfully!");
    apiResponse.setResult(directorService.createDirector(request));
    return apiResponse;
  }

  @PutMapping("/{id}")
  public ApiResponse<DirectorResponse> updateDirector(
      @PathVariable Long id, @RequestBody @Valid UpdateDirectorRequest request) {
    ApiResponse<DirectorResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Director has been updated successfully!");
    apiResponse.setResult(directorService.updateDirector(id, request));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  public ApiResponse<String> deleteDirector(@PathVariable Long id) {
    directorService.deleteDirector(id);
    ApiResponse<String> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Director has been deleted successfully!");
    return apiResponse;
  }
}
