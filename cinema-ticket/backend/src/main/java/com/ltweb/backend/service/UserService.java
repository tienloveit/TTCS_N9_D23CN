package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateUserRequest;
import com.ltweb.backend.dto.request.UpdateUserRequest;
import com.ltweb.backend.dto.response.PageResponse;
import com.ltweb.backend.dto.response.UserResponse;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.UserMapper;
import com.ltweb.backend.repository.BranchRepository;
import com.ltweb.backend.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
  private final UserRepository userRepository;
  private final BranchRepository branchRepository;
  private final UserMapper userMapper;
  private final PasswordEncoder passwordEncoder;

  public UserResponse createUser(CreateUserRequest createUserRequest) {
    return createUser(createUserRequest, UserRole.USER);
  }

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public UserResponse createUserByAdmin(CreateUserRequest createUserRequest) {
    User currentUser = getCurrentUser();
    if (currentUser.getRole() == UserRole.MANAGER) {
      createUserRequest.setRole(UserRole.STAFF);
      createUserRequest.setBranchId(requireManagedBranch(currentUser));
    }
    return createUser(
        createUserRequest,
        createUserRequest.getRole() != null ? createUserRequest.getRole() : UserRole.USER);
  }

  private UserResponse createUser(CreateUserRequest createUserRequest, UserRole role) {
    if (userRepository.existsByUsername(createUserRequest.getUsername())) {
      throw new AppException(ErrorCode.USER_EXISTED);
    }
    if (userRepository.existsByEmail(createUserRequest.getEmail())) {
      throw new AppException(ErrorCode.USER_EXISTED);
    }
    User user = userMapper.toUser(createUserRequest);
    user.setRole(role);
    user.setBranchId(resolveBranchId(role, createUserRequest.getBranchId()));
    user.setStatus(UserStatus.ACTIVE);
    user.setPassword(passwordEncoder.encode(createUserRequest.getPassword()));
    User savedUser = userRepository.save(user);
    return userMapper.toUserResponse(savedUser);
  }

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public PageResponse<List<UserResponse>> searchUsers(
      String username, String email, String phone, Pageable pageable) {
    Specification<User> specification =
        (root, query, criteriaBuilder) -> {
          List<Predicate> predicates = new ArrayList<>();

          if (StringUtils.hasText(username)) {
            predicates.add(
                criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("username")),
                    "%" + username.trim().toLowerCase() + "%"));
          }

          if (StringUtils.hasText(email)) {
            predicates.add(
                criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("email")),
                    "%" + email.trim().toLowerCase() + "%"));
          }

          if (StringUtils.hasText(phone)) {
            predicates.add(
                criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("phoneNumber")),
                    "%" + phone.trim().toLowerCase() + "%"));
          }

          User currentUser = getCurrentUser();
          if (currentUser.getRole() == UserRole.MANAGER) {
            predicates.add(criteriaBuilder.equal(root.get("role"), UserRole.STAFF));
            predicates.add(criteriaBuilder.equal(root.get("branchId"), requireManagedBranch(currentUser)));
          }

          return predicates.isEmpty()
              ? criteriaBuilder.conjunction()
              : criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

    var usersPage = userRepository.findAll(specification, pageable).map(userMapper::toUserResponse);

    return new PageResponse<>(
        usersPage.getContent(),
        usersPage.getNumber() + 1,
        usersPage.getSize(),
        usersPage.getTotalElements(),
        usersPage.getTotalPages());
  }

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public UserResponse getUserById(Long id) {
    User user =
        userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    requireUserAccess(user);
    return userMapper.toUserResponse(user);
  }

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public UserResponse updateUser(Long id, UpdateUserRequest updateUserRequest) {
    User user =
        userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    User currentUser = getCurrentUser();
    requireUserAccess(user);
    if (currentUser.getRole() == UserRole.MANAGER) {
      updateUserRequest.setRole(UserRole.STAFF);
      updateUserRequest.setBranchId(requireManagedBranch(currentUser));
    }

    userMapper.updateUser(user, updateUserRequest);
    user.setBranchId(resolveBranchId(user.getRole(), updateUserRequest.getBranchId()));
    return userMapper.toUserResponse(userRepository.save(user));
  }

  private Long resolveBranchId(UserRole role, Long branchId) {
    if (role == UserRole.MANAGER || role == UserRole.STAFF) {
      if (branchId == null || !branchRepository.existsById(branchId)) {
        throw new AppException(ErrorCode.VALIDATION_ERROR);
      }
      return branchId;
    }
    return null;
  }

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public void deleteUser(Long id) {
    User user =
        userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    requireUserAccess(user);

    userRepository.delete(user);
  }

  @PostAuthorize("returnObject.username == authentication.name")
  public UserResponse getMyInfo() {
    var context = SecurityContextHolder.getContext();
    String name = Objects.requireNonNull(context.getAuthentication()).getName();
    User user =
        userRepository
            .findByUsername(name)
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    return userMapper.toUserResponse(user);
  }

  @PostAuthorize("returnObject.username == authentication.name")
  public UserResponse updateMyInfo(UpdateUserRequest updateUserRequest) {
    var context = SecurityContextHolder.getContext();
    String name = Objects.requireNonNull(context.getAuthentication()).getName();
    User user =
        userRepository
            .findByUsername(name)
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

    userMapper.updateUser(user, updateUserRequest);
    return userMapper.toUserResponse(userRepository.save(user));
  }

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public UserResponse updateUserStatus(Long id, UserStatus status) {
    User user =
        userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    requireUserAccess(user);
    user.setStatus(status);
    return userMapper.toUserResponse(userRepository.save(user));
  }

  private void requireUserAccess(User targetUser) {
    User currentUser = getCurrentUser();
    if (currentUser.getRole() == UserRole.ADMIN) {
      return;
    }
    if (currentUser.getRole() == UserRole.MANAGER
        && targetUser.getRole() == UserRole.STAFF
        && Objects.equals(targetUser.getBranchId(), requireManagedBranch(currentUser))) {
      return;
    }
    throw new AccessDeniedException("User access denied");
  }

  private Long requireManagedBranch(User user) {
    if (user.getBranchId() == null) {
      throw new AccessDeniedException("Manager is not assigned to a branch");
    }
    return user.getBranchId();
  }

  private User getCurrentUser() {
    var context = SecurityContextHolder.getContext();
    String name = Objects.requireNonNull(context.getAuthentication()).getName();
    return userRepository
        .findByUsername(name)
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }
}
