package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.ltweb.backend.dto.request.CreateFoodRequest;
import com.ltweb.backend.dto.request.UpdateFoodRequest;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class FoodAvailabilityTest {
    @Mock private FoodRepository foodRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditLogService auditLogService;
    @InjectMocks private FoodService foodService;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void newlyCreatedFoodCanBeSoldWithoutAnInventoryReceipt() {
        authenticateManager();
        AtomicReference<Food> savedFood = new AtomicReference<>();
        when(foodRepository.save(any(Food.class))).thenAnswer(invocation -> {
            Food food = invocation.getArgument(0);
            food.setId(1L);
            savedFood.set(food);
            return food;
        });
        when(foodRepository.findByActiveTrueOrderByNameAsc())
                .thenAnswer(invocation -> List.of(savedFood.get()));

        var created = foodService.createFood(CreateFoodRequest.builder()
                .name("Water").price(BigDecimal.TEN).build());

        assertThat(created.getActive()).isTrue();
        assertThat(created.getBranchId()).isEqualTo(1L);
        assertThat(foodService.getAvailableFoods()).extracting("id").containsExactly(created.getId());
    }

    @Test
    void managerMenuStillIncludesOnlyTheirBranchAndSharedFoods() {
        authenticateManager();
        when(foodRepository.findByActiveTrueOrderByNameAsc()).thenReturn(List.of(
                Food.builder().id(1L).name("Local").branchId(1L).active(true).build(),
                Food.builder().id(2L).name("Shared").active(true).build(),
                Food.builder().id(3L).name("Other branch").branchId(2L).active(true).build()));

        assertThat(foodService.getAvailableFoods()).extracting("id").containsExactly(1L, 2L);
    }

    @Test
    void managerCanStopSellingFood() {
        authenticateManager();
        Food food = Food.builder().id(1L).name("Water").branchId(1L).active(true).build();
        when(foodRepository.findByIdIn(List.of(1L))).thenReturn(List.of(food));
        when(foodRepository.save(food)).thenReturn(food);

        var updated = foodService.updateFood(1L, UpdateFoodRequest.builder().active(false).build());

        assertThat(updated.getActive()).isFalse();
    }

    @Test
    void managerCannotModifyFoodFromAnotherBranch() {
        authenticateManager();
        Food food = Food.builder().id(1L).name("Water").branchId(2L).active(true).build();
        when(foodRepository.findByIdIn(List.of(1L))).thenReturn(List.of(food));

        assertThatThrownBy(() -> foodService.updateFood(1L, UpdateFoodRequest.builder().active(false).build()))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(food.getActive()).isTrue();
    }

    private void authenticateManager() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("manager", "n/a", List.of()));
        when(userRepository.findByUsername("manager")).thenReturn(Optional.of(
                User.builder().username("manager").role(UserRole.MANAGER).branchId(1L).build()));
    }
}
