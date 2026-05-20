package com.ltweb.backend.service;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.FoodRepository;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FoodInventoryService {
  private final FoodRepository foodRepository;

  public void requireAvailable(List<Food> foods, Map<Long, Integer> quantities) {
    if (foods.isEmpty()) {
      return;
    }
    for (Food food : foods) {
      requireEnoughStock(food, quantities.get(food.getId()));
    }
  }

  public void deductForBooking(Booking booking) {
    List<BookingFood> bookingFoods = getBookingFoods(booking);
    if (bookingFoods.isEmpty()) {
      return;
    }
    Map<Long, Integer> quantities = toQuantities(bookingFoods);
    Map<Long, Food> lockedFoods = lockFoods(quantities.keySet());

    for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
      Food food = lockedFoods.get(entry.getKey());
      requireEnoughStock(food, entry.getValue());
      if (food.getStockQuantity() != null) {
        food.setStockQuantity(food.getStockQuantity() - entry.getValue());
      }
    }
    foodRepository.saveAll(lockedFoods.values());
  }

  public void restoreForBooking(Booking booking) {
    List<BookingFood> bookingFoods = getBookingFoods(booking);
    if (bookingFoods.isEmpty()) {
      return;
    }
    Map<Long, Integer> quantities = toQuantities(bookingFoods);
    Map<Long, Food> lockedFoods = lockFoods(quantities.keySet());

    for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
      Food food = lockedFoods.get(entry.getKey());
      if (food.getStockQuantity() != null) {
        food.setStockQuantity(food.getStockQuantity() + entry.getValue());
      }
    }
    foodRepository.saveAll(lockedFoods.values());
  }

  private void requireEnoughStock(Food food, Integer quantity) {
    if (food == null || quantity == null || quantity <= 0) {
      throw new AppException(ErrorCode.FOOD_OUT_OF_STOCK);
    }
    Integer stock = food.getStockQuantity();
    if (stock != null && stock < quantity) {
      throw new AppException(ErrorCode.FOOD_OUT_OF_STOCK);
    }
  }

  private Map<Long, Food> lockFoods(Set<Long> foodIds) {
    Map<Long, Food> foods =
        foodRepository.findByIdIn(foodIds).stream()
            .collect(Collectors.toMap(Food::getId, Function.identity()));
    if (foods.size() != foodIds.size()) {
      throw new AppException(ErrorCode.FOOD_NOT_FOUND);
    }
    return foods;
  }

  private Map<Long, Integer> toQuantities(List<BookingFood> bookingFoods) {
    return bookingFoods.stream()
        .filter(bookingFood -> bookingFood.getFood() != null)
        .collect(
            Collectors.toMap(
                bookingFood -> bookingFood.getFood().getId(),
                bookingFood -> Objects.requireNonNullElse(bookingFood.getQuantity(), 0),
                Integer::sum));
  }

  private List<BookingFood> getBookingFoods(Booking booking) {
    return booking.getBookingFoods() == null ? List.of() : booking.getBookingFoods();
  }
}
