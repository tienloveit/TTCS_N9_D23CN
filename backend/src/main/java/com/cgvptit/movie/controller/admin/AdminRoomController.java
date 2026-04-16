package com.cgvptit.movie.controller.admin;

import com.cgvptit.movie.dto.request.RoomRequestDTO;
import com.cgvptit.movie.dto.request.RoomUpdateDTO;
import com.cgvptit.movie.dto.request.SeatTypeUpdateDTO;
import com.cgvptit.movie.dto.response.RoomResponseDTO;
import com.cgvptit.movie.entity.Seat;
import com.cgvptit.movie.mapper.RoomBeanMapper;
import com.cgvptit.movie.service.AdminRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/rooms")
@RequiredArgsConstructor
public class AdminRoomController {

    private final AdminRoomService adminRoomService;
    private final RoomBeanMapper roomBeanMapper;

    @GetMapping
    public ResponseEntity<List<RoomResponseDTO>> getRooms(@RequestParam(required = false) Integer cinemaId) {
        if (cinemaId != null) {
            return ResponseEntity.ok(adminRoomService.getRoomsByCinemaId(cinemaId)
                    .stream().map(roomBeanMapper::toResponse).toList());
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponseDTO> getRoomById(@PathVariable Integer id) {
        return ResponseEntity.ok(roomBeanMapper.toResponse(adminRoomService.getRoomById(id)));
    }

    @PostMapping
    public ResponseEntity<RoomResponseDTO> createRoom(@Valid @RequestBody RoomRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(roomBeanMapper.toResponse(adminRoomService.createRoomWithSeats(request)));
    }

    // Fix: dùng @RequestBody thay vì @RequestParam
    @PutMapping("/{id}")
    public ResponseEntity<RoomResponseDTO> updateRoom(
            @PathVariable Integer id,
            @Valid @RequestBody RoomUpdateDTO request) {
        return ResponseEntity.ok(roomBeanMapper.toResponse(adminRoomService.updateRoom(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Integer id) {
        adminRoomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/seats")
    public ResponseEntity<List<Seat>> getRoomSeats(@PathVariable Integer id) {
        return ResponseEntity.ok(adminRoomService.getSeatsByRoomId(id));
    }

    // Patch loại ghế: STANDARD <-> VIP
    @PatchMapping("/{roomId}/seats/{seatId}/type")
    public ResponseEntity<Seat> updateSeatType(
            @PathVariable Integer roomId,
            @PathVariable Integer seatId,
            @Valid @RequestBody SeatTypeUpdateDTO request) {
        return ResponseEntity.ok(adminRoomService.updateSeatType(roomId, seatId, request));
    }
}
