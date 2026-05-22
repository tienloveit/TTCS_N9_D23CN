package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreatePromotionRequest;
import com.ltweb.backend.dto.response.PromotionResponse;
import com.ltweb.backend.entity.Promotion;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.MembershipTier;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.BranchRepository;
import com.ltweb.backend.repository.PromotionRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PromotionService {

  private final PromotionRepository promotionRepository;
  private final BranchRepository branchRepository;
  private final UserRepository userRepository;

  @Transactional
  public PromotionResponse createPromotion(CreatePromotionRequest request) {
    if (promotionRepository.existsByCodeIgnoreCase(request.getCode().trim())) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }

    Long branchId = resolveWritableBranchId(request.getBranchId());
    Promotion promotion =
        Promotion.builder()
            .code(request.getCode().trim().toUpperCase())
            .description(request.getDescription())
            .discountPercent(request.getDiscountPercent())
            .maxDiscount(request.getMaxDiscount())
            .minOrderAmount(
                request.getMinOrderAmount() != null
                    ? request.getMinOrderAmount()
                    : BigDecimal.ZERO)
            .minMembershipTier(request.getMinMembershipTier())
            .branchId(branchId)
            .startDate(request.getStartDate())
            .endDate(request.getEndDate())
            .usageLimit(request.getUsageLimit())
            .active(request.getActive() != null ? request.getActive() : true)
            .build();

    promotionRepository.save(promotion);
    return toResponse(promotion);
  }

  @Transactional(readOnly = true)
  public List<PromotionResponse> getAllPromotions() {
    User user = getUserCurrent();
    Long managerBranchId = user.getRole() == UserRole.MANAGER ? requireManagedBranch(user) : null;
    return promotionRepository.findAll().stream()
        .filter(p -> user.getRole() != UserRole.MANAGER
            || p.getBranchId() == null
            || Objects.equals(p.getBranchId(), managerBranchId))
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<PromotionResponse> getAvailablePromotions() {
    User user = getUserCurrent();
    MembershipTier userTier =
        user.getMembershipTier() != null ? user.getMembershipTier() : MembershipTier.BRONZE;
    LocalDateTime now = LocalDateTime.now();

    return promotionRepository.findAllByActiveTrue().stream()
        .filter(
            p -> {
              if (p.getStartDate() != null && now.isBefore(p.getStartDate())) return false;
              if (p.getEndDate() != null && now.isAfter(p.getEndDate())) return false;
              if (p.getUsageLimit() != null && p.getUsedCount() >= p.getUsageLimit()) return false;
              if (p.getMinMembershipTier() != null
                  && userTier.ordinal() < p.getMinMembershipTier().ordinal()) return false;
              return true;
            })
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public PromotionResponse updatePromotion(Long id, CreatePromotionRequest request) {
    Promotion promotion =
        promotionRepository
            .findById(id)
            .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
    requirePromotionAccess(promotion);

    promotion.setDescription(request.getDescription());
    promotion.setDiscountPercent(request.getDiscountPercent());
    promotion.setMaxDiscount(request.getMaxDiscount());
    promotion.setMinOrderAmount(
        request.getMinOrderAmount() != null ? request.getMinOrderAmount() : BigDecimal.ZERO);
    promotion.setMinMembershipTier(request.getMinMembershipTier());
    promotion.setBranchId(resolveWritableBranchId(request.getBranchId()));
    promotion.setStartDate(request.getStartDate());
    promotion.setEndDate(request.getEndDate());
    promotion.setUsageLimit(request.getUsageLimit());
    if (request.getActive() != null) {
      promotion.setActive(request.getActive());
    }

    promotionRepository.save(promotion);
    return toResponse(promotion);
  }

  @Transactional
  public void deletePromotion(Long id) {
    Promotion promotion =
        promotionRepository
            .findById(id)
            .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));
    requirePromotionAccess(promotion);
    promotion.setActive(false);
    promotionRepository.save(promotion);
  }

  /**
   * Validate mã giảm giá và trả về số tiền được giảm. Nếu không hợp lệ, throw exception.
   */
  @Transactional(readOnly = true)
  public BigDecimal validatePromotion(
      String code, BigDecimal orderAmount, Long userId, Long branchId) {
    Promotion promotion =
        promotionRepository
            .findByCodeIgnoreCase(code.trim())
            .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND));

    if (!Boolean.TRUE.equals(promotion.getActive())) {
      throw new AppException(ErrorCode.PROMOTION_EXPIRED);
    }

    LocalDateTime now = LocalDateTime.now();
    if (promotion.getStartDate() != null && now.isBefore(promotion.getStartDate())) {
      throw new AppException(ErrorCode.PROMOTION_EXPIRED);
    }
    if (promotion.getEndDate() != null && now.isAfter(promotion.getEndDate())) {
      throw new AppException(ErrorCode.PROMOTION_EXPIRED);
    }

    if (promotion.getUsageLimit() != null && promotion.getUsedCount() >= promotion.getUsageLimit()) {
      throw new AppException(ErrorCode.PROMOTION_USAGE_LIMIT);
    }

    if (promotion.getMinOrderAmount() != null
        && orderAmount.compareTo(promotion.getMinOrderAmount()) < 0) {
      throw new AppException(ErrorCode.PROMOTION_MIN_ORDER);
    }

    // kiểm tra hạng thành viên
    if (promotion.getMinMembershipTier() != null) {
      User user =
          userRepository
              .findById(userId)
              .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
      MembershipTier userTier =
          user.getMembershipTier() != null ? user.getMembershipTier() : MembershipTier.BRONZE;
      if (userTier.ordinal() < promotion.getMinMembershipTier().ordinal()) {
        throw new AppException(ErrorCode.PROMOTION_TIER_NOT_MET);
      }
    }

    // kiểm tra chi nhánh
    if (promotion.getBranchId() != null
        && branchId != null
        && !Objects.equals(promotion.getBranchId(), branchId)) {
      throw new AppException(ErrorCode.PROMOTION_EXPIRED);
    }

    // tính số tiền giảm
    BigDecimal discount =
        orderAmount
            .multiply(BigDecimal.valueOf(promotion.getDiscountPercent()))
            .divide(BigDecimal.valueOf(100), 0, RoundingMode.FLOOR);

    if (promotion.getMaxDiscount() != null
        && discount.compareTo(promotion.getMaxDiscount()) > 0) {
      discount = promotion.getMaxDiscount();
    }

    return discount;
  }

  /**
   * Tăng usedCount sau khi booking thành công.
   */
  @Transactional
  public void incrementUsage(String code) {
    promotionRepository
        .findByCodeIgnoreCase(code.trim())
        .ifPresent(
            p -> {
              p.setUsedCount(p.getUsedCount() + 1);
              promotionRepository.save(p);
            });
  }

  // ===== HELPERS =====
  private PromotionResponse toResponse(Promotion p) {
    String branchName = null;
    if (p.getBranchId() != null) {
      branchName =
          branchRepository
              .findById(p.getBranchId())
              .map(b -> b.getName())
              .orElse(null);
    }

    return PromotionResponse.builder()
        .id(p.getId())
        .code(p.getCode())
        .description(p.getDescription())
        .discountPercent(p.getDiscountPercent())
        .maxDiscount(p.getMaxDiscount())
        .minOrderAmount(p.getMinOrderAmount())
        .minMembershipTier(p.getMinMembershipTier())
        .branchId(p.getBranchId())
        .branchName(branchName)
        .startDate(p.getStartDate())
        .endDate(p.getEndDate())
        .usageLimit(p.getUsageLimit())
        .usedCount(p.getUsedCount())
        .active(p.getActive())
        .createdAt(p.getCreatedAt())
        .build();
  }

  private User getUserCurrent() {
    String username =
        Objects.requireNonNull(SecurityContextHolder.getContext().getAuthentication()).getName();
    return userRepository
        .findByUsername(username)
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }

  private Long resolveWritableBranchId(Long requestedBranchId) {
    User user = getUserCurrent();
    if (user.getRole() == UserRole.MANAGER) {
      return requireManagedBranch(user);
    }
    return requestedBranchId;
  }

  private void requirePromotionAccess(Promotion promotion) {
    User user = getUserCurrent();
    if (user.getRole() == UserRole.ADMIN) {
      return;
    }
    if (user.getRole() == UserRole.MANAGER
        && Objects.equals(promotion.getBranchId(), requireManagedBranch(user))) {
      return;
    }
    throw new AccessDeniedException("Promotion access denied");
  }

  private Long requireManagedBranch(User user) {
    if (user.getBranchId() == null) {
      throw new AccessDeniedException("Manager is not assigned to a branch");
    }
    return user.getBranchId();
  }
}
