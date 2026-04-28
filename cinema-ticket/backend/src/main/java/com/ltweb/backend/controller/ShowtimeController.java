package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateShowtimeRequest;
import com.ltweb.backend.dto.request.UpdateShowtimeRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.ShowtimeResponse;
import com.ltweb.backend.service.ShowtimeService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/showtime")
@RequiredArgsConstructor
public class ShowtimeController {

  private final ShowtimeService showtimeService;

  @GetMapping
  public ApiResponse<List<ShowtimeResponse>> getAll() {
    ApiResponse<List<ShowtimeResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(showtimeService.getAll());
    return apiResponse;
  }

  @GetMapping("/today")
  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  public ApiResponse<List<ShowtimeResponse>> getToday() {
    ApiResponse<List<ShowtimeResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(showtimeService.getToday());
    return apiResponse;
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<ShowtimeResponse> create(@Valid @RequestBody CreateShowtimeRequest request) {
    ApiResponse<ShowtimeResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Create showtime successfully!");
    apiResponse.setResult(showtimeService.createShowtime(request));
    return apiResponse;
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<ShowtimeResponse> update(
      @PathVariable Long id, @RequestBody UpdateShowtimeRequest request) {
    ApiResponse<ShowtimeResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Showtime has been updated successfully!");
    apiResponse.setResult(showtimeService.update(id, request));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  public ApiResponse<String> delete(@PathVariable Long id) {
    ApiResponse<String> apiResponse = new ApiResponse<>();
    showtimeService.delete(id);
    apiResponse.setMessage("Showtime has been deleted successfully!");
    return apiResponse;
  }

  @GetMapping("/{id}")
  public ApiResponse<ShowtimeResponse> getById(@PathVariable Long id) {
    ApiResponse<ShowtimeResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(showtimeService.getById(id));
    return apiResponse;
  }

  @GetMapping("/room/{roomId}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<List<ShowtimeResponse>> getByRoom(@PathVariable Long roomId) {
    ApiResponse<List<ShowtimeResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(showtimeService.getByRoom(roomId));
    return apiResponse;
  }

  @GetMapping("/movie/{movieId}")
  public ApiResponse<List<ShowtimeResponse>> getByMovie(@PathVariable Long movieId) {
    ApiResponse<List<ShowtimeResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(showtimeService.getByMovie(movieId));
    return apiResponse;
  }

  @GetMapping("/branch/{branchId}")
  public ApiResponse<List<Map<String, Object>>> getByBranch(
      @PathVariable Long branchId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate date) {
    if (date == null) {
      date = LocalDate.now();
    }
    ApiResponse<List<Map<String, Object>>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(showtimeService.getByBranch(branchId, date));
    return apiResponse;
  }
}
