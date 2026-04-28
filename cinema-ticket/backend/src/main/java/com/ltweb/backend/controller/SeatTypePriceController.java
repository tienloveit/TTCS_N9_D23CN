package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateSeatTypePrice;
import com.ltweb.backend.dto.request.UpdateSeatTypePrice;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.SeatTypePriceResponse;
import com.ltweb.backend.enums.SeatType;
import com.ltweb.backend.service.SeatTypePriceService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/seat-type-price")
@RequiredArgsConstructor
public class SeatTypePriceController {

  private final SeatTypePriceService seatTypePriceService;

  @GetMapping
  public ApiResponse<List<SeatTypePriceResponse>> getAllSeatTypePrices() {
    ApiResponse<List<SeatTypePriceResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(seatTypePriceService.getAllPrice());
    return apiResponse;
  }

  @PostMapping
  public ApiResponse<SeatTypePriceResponse> create(@RequestBody CreateSeatTypePrice request) {
    ApiResponse<SeatTypePriceResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Create seat type price successfully!");
    apiResponse.setResult(seatTypePriceService.createPrice(request));
    return apiResponse;
  }

  @PutMapping("/{seatType}")
  public ApiResponse<SeatTypePriceResponse> update(
      @PathVariable SeatType seatType, @RequestBody UpdateSeatTypePrice request) {
    ApiResponse<SeatTypePriceResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Seat type price has been updated successfully!");
    apiResponse.setResult(seatTypePriceService.update(seatType, request));
    return apiResponse;
  }
}
