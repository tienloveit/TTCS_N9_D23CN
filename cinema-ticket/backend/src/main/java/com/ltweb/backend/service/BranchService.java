package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateBranchRequest;
import com.ltweb.backend.dto.request.UpdateBranchRequest;
import com.ltweb.backend.dto.response.BranchResponse;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BranchMapper;
import com.ltweb.backend.repository.BranchRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BranchService {
  private final BranchRepository branchRepository;
  private final BranchMapper branchMapper;

  public BranchResponse createBranch(CreateBranchRequest createBranchRequest) {
    Branch branch = branchMapper.toBranchEntity(createBranchRequest);
    return branchMapper.toBranchResponse(branchRepository.save(branch));
  }

  public List<BranchResponse> getAllBranches() {
    return branchRepository.findAll().stream().map(branchMapper::toBranchResponse).toList();
  }

  public BranchResponse getBranchById(Long branchId) {
    Branch branch = getBranchByBranchId(branchId);
    return branchMapper.toBranchResponse(branch);
  }

  public BranchResponse updateBranch(Long branchId, UpdateBranchRequest request) {
    Branch branch = getBranchByBranchId(branchId);

    branchMapper.updateBranch(request, branch);

    return branchMapper.toBranchResponse(branchRepository.save(branch));
  }

  public void deleteBranch(Long branchId) {
    Branch branch = getBranchByBranchId(branchId);
    branchRepository.delete(branch);
  }

  // ===== PRIVATE HELPER =====
  private Branch getBranchByBranchId(Long branchId) {
    return branchRepository
        .findById(branchId)
        .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));
  }
}
