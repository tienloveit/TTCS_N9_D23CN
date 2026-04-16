package com.cgvptit.movie.controller.admin;

import com.cgvptit.movie.dto.request.ShowtimeRequestDTO;
import com.cgvptit.movie.dto.response.ShowtimeResponseDTO;
import com.cgvptit.movie.mapper.ShowtimeBeanMapper;
import com.cgvptit.movie.service.AdminShowtimeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/showtimes")
@RequiredArgsConstructor
public class AdminShowtimeController {

    private final AdminShowtimeService adminShowtimeService;
    private final ShowtimeBeanMapper showtimeBeanMapper;

    @GetMapping
    public ResponseEntity<?> getShowtimes(
            @RequestParam(required = false) Integer roomId,
            @RequestParam(required = false) Integer movieId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        if (roomId != null) {
            return ResponseEntity.ok(adminShowtimeService.getShowtimesByRoom(roomId)
                    .stream().map(showtimeBeanMapper::toResponse).toList());
        }
        if (movieId != null) {
            return ResponseEntity.ok(adminShowtimeService.getShowtimesByMovie(movieId)
                    .stream().map(showtimeBeanMapper::toResponse).toList());
        }
        Page<ShowtimeResponseDTO> result = adminShowtimeService.getAllShowtimes(page, size)
                .map(showtimeBeanMapper::toResponse);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShowtimeResponseDTO> getShowtimeById(@PathVariable Integer id) {
        return ResponseEntity.ok(showtimeBeanMapper.toResponse(adminShowtimeService.getShowtimeById(id)));
    }

    @PostMapping
    public ResponseEntity<ShowtimeResponseDTO> createShowtime(@Valid @RequestBody ShowtimeRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(showtimeBeanMapper.toResponse(adminShowtimeService.createShowtime(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShowtimeResponseDTO> updateShowtime(
            @PathVariable Integer id,
            @Valid @RequestBody ShowtimeRequestDTO request) {
        return ResponseEntity.ok(showtimeBeanMapper.toResponse(adminShowtimeService.updateShowtime(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShowtime(@PathVariable Integer id) {
        adminShowtimeService.deleteShowtime(id);
        return ResponseEntity.noContent().build();
    }
}
