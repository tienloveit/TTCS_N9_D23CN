package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateSeatRequest;
import com.ltweb.backend.dto.request.UpdateSeatRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.SeatResponse;
import com.ltweb.backend.service.SeatService;
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
@RequestMapping("/seat")
@RequiredArgsConstructor
public class SeatController {

  private final SeatService seatService;

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<SeatResponse> createSeat(@RequestBody @Valid CreateSeatRequest request) {
    ApiResponse<SeatResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Create seat successfully!");
    apiResponse.setResult(seatService.createSeat(request));
    return apiResponse;
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<SeatResponse> update(
      @PathVariable Long id, @RequestBody UpdateSeatRequest request) {
    ApiResponse<SeatResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Seat has been updated successfully!");
    apiResponse.setResult(seatService.updateSeat(id, request));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<String> delete(@PathVariable Long id) {
    ApiResponse<String> apiResponse = new ApiResponse<>();
    seatService.deleteSeat(id);
    apiResponse.setMessage("Seat has been deleted successfully!");
    return apiResponse;
  }

  @GetMapping("/{id}")
  public ApiResponse<SeatResponse> getById(@PathVariable Long id) {
    ApiResponse<SeatResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(seatService.getSeatById(id));
    return apiResponse;
  }

  @GetMapping("/room/{roomId}")
  public ApiResponse<List<SeatResponse>> getByRoom(@PathVariable Long roomId) {
    ApiResponse<List<SeatResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(seatService.getSeatsByRoom(roomId));
    return apiResponse;
  }
}
