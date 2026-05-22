package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateBranchRequest;
import com.ltweb.backend.dto.request.UpdateBranchRequest;
import com.ltweb.backend.dto.response.BranchResponse;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BranchMapper;
import com.ltweb.backend.repository.BranchRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BranchService {
  private final BranchRepository branchRepository;
  private final UserRepository userRepository;
  private final BranchMapper branchMapper;

  public BranchResponse createBranch(CreateBranchRequest createBranchRequest) {
    requireAdmin();
    Branch branch = branchMapper.toBranchEntity(createBranchRequest);
    return branchMapper.toBranchResponse(branchRepository.save(branch));
  }

  public List<BranchResponse> getAllBranches() {
    User currentUser = getCurrentUserOrNull();
    if (currentUser != null && currentUser.getRole() == UserRole.MANAGER) {
      Long branchId = requireManagedBranch(currentUser);
      return branchRepository.findById(branchId).stream().map(branchMapper::toBranchResponse).toList();
    }
    return branchRepository.findAll().stream().map(branchMapper::toBranchResponse).toList();
  }

  public BranchResponse getBranchById(Long branchId) {
    requireBranchAccess(branchId);
    Branch branch = getBranchByBranchId(branchId);
    return branchMapper.toBranchResponse(branch);
  }

  public BranchResponse updateBranch(Long branchId, UpdateBranchRequest request) {
    requireBranchAccess(branchId);
    Branch branch = getBranchByBranchId(branchId);

    branchMapper.updateBranch(request, branch);

    return branchMapper.toBranchResponse(branchRepository.save(branch));
  }

  public void deleteBranch(Long branchId) {
    requireAdmin();
    Branch branch = getBranchByBranchId(branchId);
    branchRepository.delete(branch);
  }

  private void requireAdmin() {
    User user = getCurrentUser();
    if (user.getRole() != UserRole.ADMIN) {
      throw new AccessDeniedException("Only admin can perform this action");
    }
  }

  private void requireBranchAccess(Long branchId) {
    User user = getCurrentUser();
    if (user.getRole() == UserRole.ADMIN) {
      return;
    }
    if (user.getRole() == UserRole.MANAGER
        && Objects.equals(requireManagedBranch(user), branchId)) {
      return;
    }
    throw new AccessDeniedException("Branch access denied");
  }

  private Long requireManagedBranch(User user) {
    if (user.getBranchId() == null) {
      throw new AccessDeniedException("Manager is not assigned to a branch");
    }
    return user.getBranchId();
  }

  private User getCurrentUser() {
    return userRepository
        .findByUsername(SecurityContextHolder.getContext().getAuthentication().getName())
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }

  private User getCurrentUserOrNull() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated()) {
      return null;
    }
    return userRepository.findByUsername(authentication.getName()).orElse(null);
  }

  // ===== PRIVATE HELPER =====
  private Branch getBranchByBranchId(Long branchId) {
    return branchRepository
        .findById(branchId)
        .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));
  }
}
