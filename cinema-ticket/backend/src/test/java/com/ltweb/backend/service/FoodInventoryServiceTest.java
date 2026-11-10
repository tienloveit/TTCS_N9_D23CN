package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.FoodStockTransaction;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.FoodStockTransactionType;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.FoodStockTransactionRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class FoodInventoryServiceTest {
  @Mock private FoodRepository foodRepository;
  @Mock private FoodStockTransactionRepository stockTransactionRepository;
  @Mock private UserRepository userRepository;
  @Mock private NotificationService notificationService;

  @InjectMocks private FoodInventoryService foodInventoryService;

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @ParameterizedTest
  @CsvSource({"IMPORT,5,15,5", "EXPORT,3,7,-3", "STOCKTAKE,12,12,2", "STOCKTAKE,7,7,-3", "STOCKTAKE,0,0,-10", "STOCKTAKE,10,10,0"})
  void adjustStock_recordsTheChosenOperationAndBalancedQuantities(
      FoodStockTransactionType type, int quantity, int after, int change) {
    Food food = prepareAdjustment(10, UserRole.MANAGER, 1L);
    food.setBranchId(1L);

    foodInventoryService.adjustStock(1L, quantity, type, "  Inventory check  ", 10);

    assertThat(food.getStockQuantity()).isEqualTo(after);
    ArgumentCaptor<FoodStockTransaction> captor = ArgumentCaptor.forClass(FoodStockTransaction.class);
    verify(stockTransactionRepository).save(captor.capture());
    FoodStockTransaction transaction = captor.getValue();
    assertThat(transaction.getType()).isEqualTo(type);
    assertThat(transaction.getQuantityBefore()).isEqualTo(10);
    assertThat(transaction.getQuantityChange()).isEqualTo(change);
    assertThat(transaction.getQuantityAfter()).isEqualTo(after);
    assertThat(transaction.getNote()).isEqualTo("Inventory check");
    assertThat(transaction.getBranchId()).isEqualTo(1L);
    assertThat(transaction.getCreatedBy().getUsername()).isEqualTo("operator");
    verify(foodRepository).findByIdIn(Set.of(1L));
  }

  @Test
  void adjustStock_rejectsExportBeyondAvailableStock() {
    prepareAdjustment(2, UserRole.ADMIN, null);
    assertThatThrownBy(() -> foodInventoryService.adjustStock(1L, 3, FoodStockTransactionType.EXPORT, "Damaged", 2))
        .isInstanceOf(AppException.class).extracting("errorCode").isEqualTo(ErrorCode.FOOD_OUT_OF_STOCK);
    verifyNoInteractions(stockTransactionRepository);
  }

  @Test
  void adjustStock_requiresStocktakeBeforeChangingUntrackedStock() {
    prepareAdjustment(null, UserRole.ADMIN, null);
    assertThatThrownBy(() -> foodInventoryService.adjustStock(1L, 3, FoodStockTransactionType.IMPORT, "Delivery", null))
        .isInstanceOf(AppException.class);
    verifyNoInteractions(stockTransactionRepository);
  }

  @Test
  void adjustStock_initializesUntrackedStockWithoutInventingAPriorBalance() {
    Food food = prepareAdjustment(null, UserRole.ADMIN, null);
    foodInventoryService.adjustStock(1L, 8, FoodStockTransactionType.STOCKTAKE, "Opening count", null);
    assertThat(food.getStockQuantity()).isEqualTo(8);
    ArgumentCaptor<FoodStockTransaction> captor = ArgumentCaptor.forClass(FoodStockTransaction.class);
    verify(stockTransactionRepository).save(captor.capture());
    assertThat(captor.getValue().getQuantityBefore()).isNull();
    assertThat(captor.getValue().getType()).isEqualTo(FoodStockTransactionType.STOCKTAKE);
  }

  @Test
  void adjustStock_rejectsAnotherManagersBranch() {
    Food food = prepareAdjustment(10, UserRole.MANAGER, 2L);
    food.setBranchId(1L);
    assertThatThrownBy(() -> foodInventoryService.adjustStock(1L, 1, FoodStockTransactionType.IMPORT, "Delivery", 10))
        .isInstanceOf(AccessDeniedException.class);
    verifyNoInteractions(stockTransactionRepository);
  }

  @Test
  void adjustStock_rejectsStocktakeWhenSalesChangedTheDisplayedBalance() {
    Food food = prepareAdjustment(7, UserRole.ADMIN, null);
    assertThatThrownBy(() -> foodInventoryService.adjustStock(1L, 10, FoodStockTransactionType.STOCKTAKE, "Count", 10))
        .isInstanceOf(AppException.class);
    assertThat(food.getStockQuantity()).isEqualTo(7);
    verifyNoInteractions(stockTransactionRepository);
  }

  @Test
  void adjustStock_rejectsQuantityOverflow() {
    prepareAdjustment(Integer.MAX_VALUE, UserRole.ADMIN, null);
    assertThatThrownBy(() -> foodInventoryService.adjustStock(1L, 1, FoodStockTransactionType.IMPORT, "Delivery", Integer.MAX_VALUE))
        .isInstanceOf(AppException.class);
    verifyNoInteractions(stockTransactionRepository);
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {"  "})
  void adjustStock_requiresAReason(String reason) {
    assertThatThrownBy(() -> foodInventoryService.adjustStock(1L, 2, FoodStockTransactionType.IMPORT, reason, 10))
        .isInstanceOf(AppException.class);
    verifyNoInteractions(foodRepository, stockTransactionRepository);
  }

  @ParameterizedTest
  @CsvSource({"IMPORT,0", "EXPORT,0", "IMPORT,-1", "STOCKTAKE,-1", "SALE,1", "REFUND,1", "ADJUSTMENT,1"})
  void adjustStock_rejectsInvalidManualOperations(FoodStockTransactionType type, int quantity) {
    assertThatThrownBy(() -> foodInventoryService.adjustStock(1L, quantity, type, "Reason", 10))
        .isInstanceOf(AppException.class);
    verifyNoInteractions(foodRepository, stockTransactionRepository);
  }

  private Food prepareAdjustment(Integer stock, UserRole role, Long branchId) {
    Food food = food(1L, stock);
    when(foodRepository.findByIdIn(Set.of(1L))).thenReturn(List.of(food));
    // Some rejection scenarios deliberately do not save the food.
    org.mockito.Mockito.lenient().when(foodRepository.save(food)).thenReturn(food);
    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("operator", "n/a", List.of()));
    when(userRepository.findByUsername("operator")).thenReturn(Optional.of(
        User.builder().username("operator").role(role).branchId(branchId).build()));
    return food;
  }

  @Test
  void deductForBooking_decreasesManagedStock() {
    Food food = food(1L, 10);
    Booking booking = bookingWithFood(food, 3);
    when(foodRepository.findByIdIn(java.util.Set.of(1L))).thenReturn(List.of(food));

    foodInventoryService.deductForBooking(booking);

    assertThat(food.getStockQuantity()).isEqualTo(7);
    ArgumentCaptor<Iterable<Food>> captor = ArgumentCaptor.forClass(Iterable.class);
    verify(foodRepository).saveAll(captor.capture());
    ArgumentCaptor<FoodStockTransaction> transactionCaptor =
        ArgumentCaptor.forClass(FoodStockTransaction.class);
    verify(stockTransactionRepository).save(transactionCaptor.capture());
    assertThat(transactionCaptor.getValue().getType()).isEqualTo(FoodStockTransactionType.SALE);
    assertThat(transactionCaptor.getValue().getQuantityChange()).isEqualTo(-3);
  }

  @Test
  void deductForBooking_throwsWhenStockIsInsufficient() {
    Food food = food(1L, 2);
    Booking booking = bookingWithFood(food, 3);
    when(foodRepository.findByIdIn(java.util.Set.of(1L))).thenReturn(List.of(food));

    assertThatThrownBy(() -> foodInventoryService.deductForBooking(booking))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.FOOD_OUT_OF_STOCK);
  }

  @Test
  void restoreForBooking_returnsStockForManagedFood() {
    Food food = food(1L, 2);
    Booking booking = bookingWithFood(food, 3);
    when(foodRepository.findByIdIn(java.util.Set.of(1L))).thenReturn(List.of(food));

    foodInventoryService.restoreForBooking(booking);

    assertThat(food.getStockQuantity()).isEqualTo(5);
    ArgumentCaptor<FoodStockTransaction> transactionCaptor =
        ArgumentCaptor.forClass(FoodStockTransaction.class);
    verify(stockTransactionRepository).save(transactionCaptor.capture());
    assertThat(transactionCaptor.getValue().getType()).isEqualTo(FoodStockTransactionType.REFUND);
    assertThat(transactionCaptor.getValue().getQuantityChange()).isEqualTo(3);
  }

  private Food food(Long id, Integer stock) {
    return Food.builder()
        .id(id)
        .name("Combo")
        .price(BigDecimal.valueOf(50000))
        .stockQuantity(stock)
        .active(true)
        .build();
  }

  private Booking bookingWithFood(Food food, int quantity) {
    Booking booking = Booking.builder().id(99L).build();
    BookingFood bookingFood =
        BookingFood.builder()
            .booking(booking)
            .food(food)
            .quantity(quantity)
            .unitPrice(food.getPrice())
            .subtotal(food.getPrice().multiply(BigDecimal.valueOf(quantity)))
            .build();
    booking.setBookingFoods(List.of(bookingFood));
    return booking;
  }
}
