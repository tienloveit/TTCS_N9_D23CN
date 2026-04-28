package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateBookingRequest;
import com.ltweb.backend.dto.request.StaffBookingRequest;
import com.ltweb.backend.dto.request.UpdateBookingRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.service.BookingService;
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
@RequestMapping("/booking")
@RequiredArgsConstructor
public class BookingController {

  private final BookingService bookingService;

  @PostMapping
  public ApiResponse<BookingResponse> createBooking(
      @RequestBody @Valid CreateBookingRequest request) {
    ApiResponse<BookingResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Booking created successfully!");
    apiResponse.setResult(bookingService.createBooking(request));
    return apiResponse;
  }

  @PostMapping("/staff")
  public ApiResponse<BookingResponse> createStaffBooking(
      @RequestBody @Valid StaffBookingRequest request) {
    ApiResponse<BookingResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Staff booking created successfully!");
    apiResponse.setResult(bookingService.createStaffBooking(request));
    return apiResponse;
  }

  @GetMapping
  public ApiResponse<List<BookingResponse>> getAllBookings() {
    ApiResponse<List<BookingResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(bookingService.getAllBookings());
    return apiResponse;
  }

  @GetMapping("/{id}")
  public ApiResponse<BookingResponse> getBookingById(@PathVariable("id") Long id) {
    ApiResponse<BookingResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(bookingService.getBookingById(id));
    return apiResponse;
  }

  @GetMapping("/my-bookings/list")
  public ApiResponse<List<BookingResponse>> getMyBookingsList() {
    ApiResponse<List<BookingResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(bookingService.getMyBookingsList());
    return apiResponse;
  }

  @GetMapping("/my-bookings/{id}")
  public ApiResponse<BookingResponse> getMyBooking(@PathVariable("id") Long id) {
    ApiResponse<BookingResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(bookingService.getMyBookings(id));
    return apiResponse;
  }

  @PutMapping("/{id}")
  public ApiResponse<BookingResponse> updateBooking(
      @PathVariable("id") Long id, @RequestBody @Valid UpdateBookingRequest request) {
    ApiResponse<BookingResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Booking updated successfully!");
    apiResponse.setResult(bookingService.updateBooking(id, request));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  public ApiResponse<String> cancelBooking(@PathVariable("id") Long id) {
    bookingService.cancelBooking(id);
    ApiResponse<String> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Booking cancelled successfully!");
    return apiResponse;
  }
}
