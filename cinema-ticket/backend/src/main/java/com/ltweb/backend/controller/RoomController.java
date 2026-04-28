package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateRoomRequest;
import com.ltweb.backend.dto.request.UpdateRoomRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.RoomResponse;
import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.service.RoomService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/room")
@RequiredArgsConstructor
public class RoomController {
  private final RoomService roomService;

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<RoomResponse> createRoom(@RequestBody @Valid CreateRoomRequest request) {
    ApiResponse<RoomResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Create room successfully!");
    apiResponse.setResult(roomService.createRoom(request));
    return apiResponse;
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<List<RoomResponse>> getAllRooms(
      @RequestParam(value = "branchId", required = false) Long branchId,
      @RequestParam(value = "status", required = false) RoomStatus status) {
    ApiResponse<List<RoomResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(roomService.getAllRooms(branchId, status));
    return apiResponse;
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<RoomResponse> getRoomById(@PathVariable("id") Long id) {
    ApiResponse<RoomResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(roomService.getRoomById(id));
    return apiResponse;
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<RoomResponse> updateRoom(
      @PathVariable("id") Long id, @RequestBody @Valid UpdateRoomRequest request) {
    ApiResponse<RoomResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Room has been updated successfully!");
    apiResponse.setResult(roomService.updateRoom(id, request));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<String> deleteRoom(@PathVariable("id") Long id) {
    ApiResponse<String> apiResponse = new ApiResponse<>();
    roomService.deleteRoom(id);
    apiResponse.setMessage("Room has been deleted successfully!");
    return apiResponse;
  }
}
