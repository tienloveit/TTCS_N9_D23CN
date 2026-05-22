package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreatePromotionRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.PromotionResponse;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.UserRepository;
import com.ltweb.backend.service.PromotionService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/promotion")
@RequiredArgsConstructor
public class PromotionController {

  private final PromotionService promotionService;
  private final UserRepository userRepository;

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public ApiResponse<PromotionResponse> create(
      @RequestBody @Valid CreatePromotionRequest request) {
    ApiResponse<PromotionResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Promotion created successfully!");
    apiResponse.setResult(promotionService.createPromotion(request));
    return apiResponse;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public ApiResponse<List<PromotionResponse>> getAll() {
    ApiResponse<List<PromotionResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(promotionService.getAllPromotions());
    return apiResponse;
  }

  @GetMapping("/available")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<List<PromotionResponse>> getAvailable() {
    ApiResponse<List<PromotionResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(promotionService.getAvailablePromotions());
    return apiResponse;
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public ApiResponse<PromotionResponse> update(
      @PathVariable("id") Long id, @RequestBody @Valid CreatePromotionRequest request) {
    ApiResponse<PromotionResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Promotion updated successfully!");
    apiResponse.setResult(promotionService.updatePromotion(id, request));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public ApiResponse<String> delete(@PathVariable("id") Long id) {
    promotionService.deletePromotion(id);
    ApiResponse<String> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Promotion disabled successfully!");
    return apiResponse;
  }

  @PostMapping("/validate")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<Map<String, Object>> validate(@RequestBody Map<String, Object> body) {
    String code = (String) body.get("code");
    BigDecimal orderAmount = new BigDecimal(String.valueOf(body.get("orderAmount")));
    Long branchId = body.get("branchId") != null ? Long.valueOf(String.valueOf(body.get("branchId"))) : null;

    // Lấy userId từ SecurityContext của user đang đăng nhập
    String username = SecurityContextHolder.getContext().getAuthentication().getName();
    User currentUser = userRepository
        .findByUsername(username)
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

    BigDecimal discount = promotionService.validatePromotion(code, orderAmount, currentUser.getId(), branchId);

    ApiResponse<Map<String, Object>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(Map.of("discountAmount", discount, "code", code));
    return apiResponse;
  }
}
