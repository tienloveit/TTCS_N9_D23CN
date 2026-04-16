package com.cgvptit.movie.service.impl;

import com.cgvptit.movie.dto.request.UserRequestDTO;
import com.cgvptit.movie.dto.response.UserDetailResponseDTO;
import com.cgvptit.movie.entity.Booking;
import com.cgvptit.movie.entity.Role;
import com.cgvptit.movie.entity.User;
import com.cgvptit.movie.enums.BookingStatus;
import com.cgvptit.movie.repository.BookingRepository;
import com.cgvptit.movie.repository.RoleRepository;
import com.cgvptit.movie.repository.UserRepository;
import com.cgvptit.movie.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BookingRepository bookingRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Page<User> getAllUsers(int page, int size, String keyword) {
        PageRequest pageRequest = PageRequest.of(page, size);
        if (keyword != null && !keyword.trim().isEmpty()) {
            return userRepository.findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrPhoneContainingIgnoreCase(
                    keyword, keyword, keyword, pageRequest);
        }
        return userRepository.findAll(pageRequest);
    }

    @Override
    public UserDetailResponseDTO getUserDetail(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy User"));
        
        List<Booking> history = bookingRepository.findByUserId(id);
        
        return UserDetailResponseDTO.builder()
                .user(user)
                .bookingHistory(history)
                .build();
    }

    @Override
    @Transactional
    public User createUser(UserRequestDTO request) {
        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role không tồn tại"));

        User user = User.builder()
                .fullName(request.getFullName())
                .username(request.getUsername())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword() != null ? request.getPassword() : "123456"))
                .role(role)
                .points(0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .createdAt(LocalDateTime.now())
                .build();

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateUser(Integer id, UserRequestDTO request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy User"));
        
        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role không tồn tại"));

        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setRole(role);
        
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        
        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
        }

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void deleteUser(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy User"));
        // Soft delete
        user.setIsActive(false);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public User toggleStatus(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy User"));
        // Flip trạng thái: true -> false, false -> true
        user.setIsActive(!Boolean.TRUE.equals(user.getIsActive()));
        return userRepository.save(user);
    }

    @Override
    public List<User> getUsersByRole(String roleName) {
        Role role = roleRepository.findByNameIgnoreCase(roleName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy role: " + roleName));
        return userRepository.findByRoleId(role.getId());
    }

    @Override
    public List<Booking> getUserBookings(Integer id) {
        if (!userRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy User");
        }
        return bookingRepository.findByUserId(id);
    }

}
