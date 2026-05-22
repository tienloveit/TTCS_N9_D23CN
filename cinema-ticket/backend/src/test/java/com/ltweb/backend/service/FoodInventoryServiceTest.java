package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.FoodStockTransaction;
import com.ltweb.backend.enums.FoodStockTransactionType;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.FoodStockTransactionRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FoodInventoryServiceTest {
  @Mock private FoodRepository foodRepository;
  @Mock private FoodStockTransactionRepository stockTransactionRepository;
  @Mock private UserRepository userRepository;
  @Mock private NotificationService notificationService;

  @InjectMocks private FoodInventoryService foodInventoryService;

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
