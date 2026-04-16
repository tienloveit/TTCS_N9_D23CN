package com.cgvptit.movie.service;

import com.cgvptit.movie.dto.request.UserRequestDTO;
import com.cgvptit.movie.dto.response.UserDetailResponseDTO;
import com.cgvptit.movie.entity.Booking;
import com.cgvptit.movie.entity.User;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

public interface AdminUserService {
    Page<User> getAllUsers(int page, int size, String keyword);
    UserDetailResponseDTO getUserDetail(Integer id);
    User createUser(UserRequestDTO request);
    User updateUser(Integer id, UserRequestDTO request);
    void deleteUser(Integer id);
    User toggleStatus(Integer id);           // Khoá / Mở khoá
    List<User> getUsersByRole(String roleName); // Lọc theo role
    List<Booking> getUserBookings(Integer id);  // Lịch sử đặt vé
}

