package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateUserRequest;
import com.ltweb.backend.dto.request.UpdateUserRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.PageResponse;
import com.ltweb.backend.dto.response.UserResponse;
import com.ltweb.backend.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController()
@RequiredArgsConstructor
public class UserController {
  private final UserService userService;

  @PostMapping("/sign-up")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<UserResponse> createUser(
      @RequestBody @Valid CreateUserRequest createUserRequest) {
    ApiResponse<UserResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Register successfully!");
    apiResponse.setResult(userService.createUser(createUserRequest));
    return apiResponse;
  }

  @GetMapping("/users")
  public ApiResponse<PageResponse<List<UserResponse>>> searchUsers(
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(required = false) String username,
      @RequestParam(required = false) String email,
      @RequestParam(required = false) String phone) {
    Sort sort = Sort.by("createdAt").descending();
    int pageIndex = Math.max(page - 1, 0);
    Pageable pageable = PageRequest.of(pageIndex, size, sort);

    ApiResponse<PageResponse<List<UserResponse>>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(userService.searchUsers(username, email, phone, pageable));
    return apiResponse;
  }

  @GetMapping("/users/{id}")
  public ApiResponse<UserResponse> getUserById(@PathVariable Long id) {
    ApiResponse<UserResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Get User by id!");
    apiResponse.setResult(userService.getUserById(id));
    return apiResponse;
  }

  @PutMapping("/users/{id}")
  public ApiResponse<UserResponse> updateUser(
      @PathVariable Long id, @RequestBody @Valid UpdateUserRequest updateUserRequest) {
    ApiResponse<UserResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("User has been updated successfully!");
    apiResponse.setResult(userService.updateUser(id, updateUserRequest));
    return apiResponse;
  }

  @DeleteMapping("/users/{id}")
  public ApiResponse<String> deleteUser(@PathVariable Long id) {
    ApiResponse<String> apiResponse = new ApiResponse<>();
    userService.deleteUser(id);
    apiResponse.setMessage("User has been deleted successfully!");
    return apiResponse;
  }

  @PutMapping("/users/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<UserResponse> updateUserStatus(
      @PathVariable Long id, @RequestParam com.ltweb.backend.enums.UserStatus status) {
    ApiResponse<UserResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("User status has been updated!");
    apiResponse.setResult(userService.updateUserStatus(id, status));
    return apiResponse;
  }

  @GetMapping("/my-info")
  public ApiResponse<UserResponse> getMyInfo() {
    ApiResponse<UserResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(userService.getMyInfo());
    return apiResponse;
  }

  @PutMapping("/my-info")
  public ApiResponse<UserResponse> updateMyInfo(
      @RequestBody @Valid UpdateUserRequest updateUserRequest) {
    ApiResponse<UserResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Your information has been updated successfully!");
    apiResponse.setResult(userService.updateMyInfo(updateUserRequest));
    return apiResponse;
  }
}
