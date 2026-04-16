package com.cgvptit.movie.controller.admin;

import com.cgvptit.movie.dto.request.UserRequestDTO;
import com.cgvptit.movie.dto.response.UserDetailResponseDTO;
import com.cgvptit.movie.entity.Booking;
import com.cgvptit.movie.entity.User;
import com.cgvptit.movie.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<Page<User>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(adminUserService.getAllUsers(page, size, keyword));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDetailResponseDTO> getUserById(@PathVariable Integer id) {
        return ResponseEntity.ok(adminUserService.getUserDetail(id));
    }

    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody UserRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminUserService.createUser(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Integer id, @Valid @RequestBody UserRequestDTO request) {
        return ResponseEntity.ok(adminUserService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // Khoá / Mở khoá tài khoản (không cần form sửa toàn bộ)
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<User> toggleStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(adminUserService.toggleStatus(id));
    }

    // Lọc theo role: ?role=STAFF hoặc ?role=CUSTOMER
    @GetMapping("/by-role")
    public ResponseEntity<List<User>> getUsersByRole(@RequestParam String role) {
        return ResponseEntity.ok(adminUserService.getUsersByRole(role));
    }

    // Lịch sử đặt vé riêng biệt (lazy-load khi cần)
    @GetMapping("/{id}/bookings")
    public ResponseEntity<List<Booking>> getUserBookings(@PathVariable Integer id) {
        return ResponseEntity.ok(adminUserService.getUserBookings(id));
    }

}
