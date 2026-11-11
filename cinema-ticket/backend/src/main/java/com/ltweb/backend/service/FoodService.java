package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateFoodRequest;
import com.ltweb.backend.dto.request.UpdateFoodRequest;
import com.ltweb.backend.dto.response.FoodResponse;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.AuditAction;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodRepository foodRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Transactional
    public FoodResponse createFood(CreateFoodRequest request) {
        Long branchId = resolveWritableBranchId(request.getBranchId());
        Food food = Food.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .imageUrl(request.getImageUrl())
                .branchId(branchId)
                .stockQuantity(request.getStockQuantity())
                .lowStockThreshold(request.getLowStockThreshold())
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
    @Transactional
    public FoodResponse updateFood(Long foodId, UpdateFoodRequest request) {
        Food food = foodRepository.findByIdIn(List.of(foodId)).stream().findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.FOOD_NOT_FOUND));
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
        if (request.getActive() != null) {
            food.setActive(request.getActive());
        }
        Integer oldStock = food.getStockQuantity();
        if (Boolean.TRUE.equals(request.getUnlimitedStock())) {
            food.setStockQuantity(null);
        } else if (request.getStockQuantity() != null) {
            food.setStockQuantity(request.getStockQuantity());
        }
        if (request.getLowStockThreshold() != null) {
            food.setLowStockThreshold(request.getLowStockThreshold());
        }

        Food saved = foodRepository.save(food);
        String stockNote = Objects.equals(oldStock, saved.getStockQuantity())
                ? ""
                : " (stock " + (oldStock == null ? "unlimited" : oldStock) + " -> "
                        + (saved.getStockQuantity() == null ? "unlimited" : saved.getStockQuantity()) + ")";
        auditLogService.record(
                AuditAction.FOOD_UPDATED, "Food", saved.getId(), "Updated food " + saved.getName() + stockNote);
        return toFoodResponse(saved);
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Transactional
    public void deleteFood(Long foodId) {
        Food food = foodRepository.findByIdIn(List.of(foodId)).stream().findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.FOOD_NOT_FOUND));
        requireFoodAccess(food);
        food.setActive(false);
        Food saved = foodRepository.save(food);
        auditLogService.record(AuditAction.FOOD_DISABLED, "Food", saved.getId(), "Disabled food " + saved.getName());
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
                .active(food.getActive())
                .build();
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
