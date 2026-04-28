package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateBranchRequest;
import com.ltweb.backend.dto.request.UpdateBranchRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.BranchResponse;
import com.ltweb.backend.service.BranchService;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/branch")
@RequiredArgsConstructor
public class BranchController {
  private final BranchService branchService;

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<BranchResponse> createBranch(
      @RequestBody @Valid CreateBranchRequest createBranchRequest) {
    ApiResponse<BranchResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Create branch successfully!");
    apiResponse.setResult(branchService.createBranch(createBranchRequest));
    return apiResponse;
  }

  @GetMapping
  public ApiResponse<List<BranchResponse>> getAllBranches() {
    ApiResponse<List<BranchResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(branchService.getAllBranches());
    return apiResponse;
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<BranchResponse> getBranchById(@PathVariable("id") Long id) {
    ApiResponse<BranchResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(branchService.getBranchById(id));
    return apiResponse;
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<BranchResponse> updateBranch(
      @PathVariable("id") Long id, @RequestBody @Valid UpdateBranchRequest updateBranchRequest) {
    ApiResponse<BranchResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Branch has been updated successfully!");
    apiResponse.setResult(branchService.updateBranch(id, updateBranchRequest));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  public ApiResponse<String> deleteBranch(@PathVariable("id") Long id) {
    ApiResponse<String> apiResponse = new ApiResponse<>();
    branchService.deleteBranch(id);
    apiResponse.setMessage("Branch has been deleted successfully!");
    return apiResponse;
  }
}
