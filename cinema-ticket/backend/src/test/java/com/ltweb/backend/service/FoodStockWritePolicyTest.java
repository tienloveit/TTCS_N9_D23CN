package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.ltweb.backend.dto.request.CreateFoodRequest;
import com.ltweb.backend.dto.request.UpdateFoodRequest;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class FoodStockWritePolicyTest {
  @Mock private FoodRepository foodRepository;
  @Mock private UserRepository userRepository;
  @Mock private AuditLogService auditLogService;
  @InjectMocks private FoodService foodService;

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void createFood_startsAtZeroUntilAnInventoryReceiptIsRecorded() {
    authenticateManager();
    when(foodRepository.save(any(Food.class))).thenAnswer(invocation -> invocation.getArgument(0));
    var response = foodService.createFood(CreateFoodRequest.builder().name("Water").price(BigDecimal.TEN).build());
    assertThat(response.getStockQuantity()).isZero();
    assertThat(response.getBranchId()).isEqualTo(1L);
  }

  @Test
  void createFood_rejectsUnrecordedOpeningStock() {
    assertThatThrownBy(() -> foodService.createFood(CreateFoodRequest.builder().stockQuantity(12).build()))
        .isInstanceOf(AppException.class);
    verifyNoInteractions(foodRepository);
  }

  @Test
  void updateFood_rejectsDirectStockWrites() {
    assertThatThrownBy(() -> foodService.updateFood(1L, UpdateFoodRequest.builder().stockQuantity(100).build()))
        .isInstanceOf(AppException.class);
    verifyNoInteractions(foodRepository);
  }

  @Test
  void updateFood_changesMetadataUnderLockAndPreservesStock() {
    authenticateManager();
    Food food = Food.builder().id(1L).name("Water").price(BigDecimal.TEN).branchId(1L).stockQuantity(7).build();
    when(foodRepository.findByIdIn(List.of(1L))).thenReturn(List.of(food));
    when(foodRepository.save(food)).thenReturn(food);

    var response = foodService.updateFood(1L, UpdateFoodRequest.builder().name("Bottled water").build());
    assertThat(response.getName()).isEqualTo("Bottled water");
    assertThat(response.getStockQuantity()).isEqualTo(7);
    verify(foodRepository).findByIdIn(List.of(1L));
  }

  private void authenticateManager() {
    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("manager", "n/a"));
    when(userRepository.findByUsername("manager")).thenReturn(Optional.of(
        User.builder().username("manager").role(UserRole.MANAGER).branchId(1L).build()));
  }
}
