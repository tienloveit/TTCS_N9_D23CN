package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateFoodRequest;
import com.ltweb.backend.dto.request.FoodStockAdjustmentRequest;
import com.ltweb.backend.dto.request.UpdateFoodRequest;
import com.ltweb.backend.dto.response.FoodStockTransactionResponse;
import com.ltweb.backend.dto.response.FoodResponse;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.FoodStockTransaction;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.AuditAction;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.FoodStockTransactionRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodRepository foodRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final FoodInventoryService foodInventoryService;
    private final FoodStockTransactionRepository stockTransactionRepository;

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public FoodResponse createFood(CreateFoodRequest request) {
        Long branchId = resolveWritableBranchId(request.getBranchId());
        Food food = Food.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .imageUrl(request.getImageUrl())
                .branchId(branchId)
                .stockQuantity(normalizeStockQuantity(request.getStockQuantity()))
                .lowStockThreshold(normalizeLowStockThreshold(request.getLowStockThreshold()))
                .active(request.getActive() == null || request.getActive())
                .build();

        Food saved = foodRepository.save(food);
        auditLogService.record(AuditAction.FOOD_CREATED, "Food", saved.getId(), "Created food " + saved.getName());
        return toFoodResponse(saved);
    }

    public List<FoodResponse> getAvailableFoods() {
        User user = getCurrentUserOrNull();
        Long branchId = user != null && (user.getRole() == UserRole.MANAGER || user.getRole() == UserRole.STAFF)
                ? user.getBranchId()
                : null;
        return foodRepository.findByActiveTrueOrderByNameAsc().stream()
                .filter(food -> branchId == null || food.getBranchId() == null
                        || Objects.equals(food.getBranchId(), branchId))
                .filter(this::isInStock)
                .map(this::toFoodResponse)
                .toList();
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public List<FoodResponse> getAllFoods() {
        User user = getCurrentUser();
        Long managerBranchId = user.getRole() == UserRole.MANAGER ? requireManagedBranch(user) : null;
        List<Food> foods = user.getRole() == UserRole.MANAGER
                ? foodRepository.findAll().stream()
                        .filter(food -> food.getBranchId() == null
                                || Objects.equals(food.getBranchId(), managerBranchId))
                        .toList()
                : foodRepository.findAll();
        return foods.stream()
                .sorted(Comparator.comparing(Food::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toFoodResponse)
                .toList();
    }

    public FoodResponse getFoodById(Long foodId) {
        return toFoodResponse(getFood(foodId));
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public FoodResponse updateFood(Long foodId, UpdateFoodRequest request) {
        Food food = getFood(foodId);
        requireFoodAccess(food);

        if (request.getName() != null && !request.getName().isBlank()) {
            food.setName(request.getName());
        }
        if (request.getDescription() != null) {
            food.setDescription(request.getDescription());
        }
        if (request.getPrice() != null) {
            food.setPrice(request.getPrice());
        }
        if (request.getImageUrl() != null) {
            food.setImageUrl(request.getImageUrl());
        }
        if (request.getBranchId() != null) {
            food.setBranchId(resolveWritableBranchId(request.getBranchId()));
        }
        if (request.getStockQuantity() != null) {
            food.setStockQuantity(normalizeStockQuantity(request.getStockQuantity()));
        }
        if (request.getLowStockThreshold() != null) {
            food.setLowStockThreshold(normalizeLowStockThreshold(request.getLowStockThreshold()));
        }
        if (request.getActive() != null) {
            food.setActive(request.getActive());
        }

        Food saved = foodRepository.save(food);
        auditLogService.record(AuditAction.FOOD_UPDATED, "Food", saved.getId(), "Updated food " + saved.getName());
        return toFoodResponse(saved);
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public void deleteFood(Long foodId) {
        Food food = getFood(foodId);
        requireFoodAccess(food);
        food.setActive(false);
        Food saved = foodRepository.save(food);
        auditLogService.record(AuditAction.FOOD_DISABLED, "Food", saved.getId(), "Disabled food " + saved.getName());
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public FoodResponse adjustStock(Long foodId, FoodStockAdjustmentRequest request) {
        Food saved = foodInventoryService.adjustStock(
                foodId,
                request.getQuantityChange(),
                Boolean.TRUE.equals(request.getSetAbsoluteQuantity()),
                request.getNote());
        auditLogService.record(
                AuditAction.FOOD_UPDATED,
                "Food",
                saved.getId(),
                "Adjusted stock for " + saved.getName() + " to " + saved.getStockQuantity());
        return toFoodResponse(saved);
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public List<FoodStockTransactionResponse> getStockTransactions(Long foodId) {
        User user = getCurrentUser();
        List<FoodStockTransaction> transactions = foodId == null
                ? (user.getRole() == UserRole.MANAGER
                        ? stockTransactionRepository
                                .findTop200ByBranchIdOrderByCreatedAtDesc(requireManagedBranch(user))
                        : stockTransactionRepository.findTop200ByOrderByCreatedAtDesc())
                : stockTransactionRepository.findTop100ByFoodIdOrderByCreatedAtDesc(foodId);
        return transactions.stream()
                .filter(transaction -> user.getRole() != UserRole.MANAGER
                        || Objects.equals(transaction.getBranchId(), requireManagedBranch(user)))
                .map(this::toStockTransactionResponse)
                .toList();
    }

    private Food getFood(Long foodId) {
        return foodRepository
                .findById(foodId)
                .orElseThrow(() -> new AppException(ErrorCode.FOOD_NOT_FOUND));
    }

    private FoodResponse toFoodResponse(Food food) {
        return FoodResponse.builder()
                .id(food.getId())
                .name(food.getName())
                .description(food.getDescription())
                .price(food.getPrice())
                .imageUrl(food.getImageUrl())
                .branchId(food.getBranchId())
                .stockQuantity(food.getStockQuantity())
                .lowStockThreshold(food.getLowStockThreshold())
                .inStock(isInStock(food))
                .lowStock(isLowStock(food))
                .active(food.getActive())
                .build();
    }

    private FoodStockTransactionResponse toStockTransactionResponse(FoodStockTransaction transaction) {
        Food food = transaction.getFood();
        User createdBy = transaction.getCreatedBy();
        return FoodStockTransactionResponse.builder()
                .transactionId(transaction.getId())
                .foodId(food == null ? null : food.getId())
                .foodName(food == null ? null : food.getName())
                .branchId(transaction.getBranchId())
                .type(transaction.getType())
                .quantityBefore(transaction.getQuantityBefore())
                .quantityChange(transaction.getQuantityChange())
                .quantityAfter(transaction.getQuantityAfter())
                .note(transaction.getNote())
                .referenceId(transaction.getReferenceId())
                .referenceType(transaction.getReferenceType())
                .createdById(createdBy == null ? null : createdBy.getId())
                .createdByUsername(createdBy == null ? null : createdBy.getUsername())
                .createdAt(transaction.getCreatedAt())
                .build();
    }

    private Integer normalizeStockQuantity(Integer quantity) {
        if (quantity == null) {
            return null;
        }
        return Math.max(quantity, 0);
    }

    private Integer normalizeLowStockThreshold(Integer threshold) {
        if (threshold == null) {
            return 5;
        }
        return Math.max(threshold, 0);
    }

    private boolean isInStock(Food food) {
        return food.getStockQuantity() == null || food.getStockQuantity() > 0;
    }

    private boolean isLowStock(Food food) {
        return food.getStockQuantity() != null
                && food.getStockQuantity() <= Objects.requireNonNullElse(food.getLowStockThreshold(), 5);
    }

    private Long resolveWritableBranchId(Long requestedBranchId) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.MANAGER) {
            return requireManagedBranch(user);
        }
        return requestedBranchId;
    }

    private void requireFoodAccess(Food food) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.ADMIN) {
            return;
        }
        if (user.getRole() == UserRole.MANAGER
                && Objects.equals(requireManagedBranch(user), food.getBranchId())) {
            return;
        }
        throw new AccessDeniedException("Food access denied");
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
        String username = authentication.getName();
        if (username == null || "anonymousUser".equals(username)) {
            return null;
        }
        return userRepository.findByUsername(username).orElse(null);
    }
}
