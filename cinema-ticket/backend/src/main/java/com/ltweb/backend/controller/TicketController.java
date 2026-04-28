package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CheckInTicketRequest;
import com.ltweb.backend.dto.request.UpdateTicketRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.TicketCheckInResponse;
import com.ltweb.backend.dto.response.TicketResponse;
import com.ltweb.backend.service.TicketService;
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
@RequestMapping("/ticket")
@RequiredArgsConstructor
public class TicketController {
  private final TicketService ticketService;

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<List<TicketResponse>> getAllTickets() {
    ApiResponse<List<TicketResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(ticketService.getAllTickets());
    return apiResponse;
  }

  @GetMapping("/showtime/{showtimeId}")
  public ApiResponse<List<TicketResponse>> getTicketsByShowtime(
      @PathVariable("showtimeId") Long showtimeId) {
    ApiResponse<List<TicketResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(ticketService.getTicketsByShowtimeId(showtimeId));
    return apiResponse;
  }

  @GetMapping("/{id}")
  public ApiResponse<TicketResponse> getTicketById(@PathVariable("id") Long id) {
    ApiResponse<TicketResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(ticketService.getTicketById(id));
    return apiResponse;
  }

  @PostMapping("/check-in")
  @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
  public ApiResponse<TicketCheckInResponse> checkIn(
      @RequestBody @Valid CheckInTicketRequest request) {
    ApiResponse<TicketCheckInResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Ticket checked in successfully!");
    apiResponse.setResult(ticketService.checkIn(request));
    return apiResponse;
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<TicketResponse> updateTicket(
      @PathVariable("id") Long id, @RequestBody UpdateTicketRequest request) {
    ApiResponse<TicketResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Ticket has been updated successfully!");
    apiResponse.setResult(ticketService.updateTicket(id, request));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<String> deleteTicket(@PathVariable("id") Long id) {
    ApiResponse<String> apiResponse = new ApiResponse<>();
    ticketService.deleteTicket(id);
    apiResponse.setMessage("Ticket has been deleted successfully!");
    return apiResponse;
  }
}
