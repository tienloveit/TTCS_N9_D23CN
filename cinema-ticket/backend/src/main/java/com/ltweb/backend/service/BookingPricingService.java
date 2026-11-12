package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateBookingFoodRequest;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.FoodRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class BookingPricingService {
  private final FoodRepository foodRepository;
  private final PromotionService promotionService;

  public Map<Long, Integer> getFoodQuantities(List<CreateBookingFoodRequest> foods) {
    if (foods == null || foods.isEmpty()) {
      return Map.of();
    }

    Set<Long> uniqueFoodIds = new HashSet<>();
    for (CreateBookingFoodRequest food : foods) {
      if (food.getFoodId() == null || food.getQuantity() == null || food.getQuantity() <= 0) {
        throw new AppException(ErrorCode.VALIDATION_ERROR);
      }
      if (!uniqueFoodIds.add(food.getFoodId())) {
        throw new AppException(ErrorCode.VALIDATION_ERROR);
      }
    }

    return foods.stream()
        .collect(
            Collectors.toMap(
                CreateBookingFoodRequest::getFoodId, CreateBookingFoodRequest::getQuantity));
  }

  public List<Food> getSelectedFoods(Map<Long, Integer> foodQuantities) {
    if (foodQuantities.isEmpty()) {
      return List.of();
    }

    List<Food> selectedFoods = foodRepository.findAllById(foodQuantities.keySet());
    boolean hasUnavailableFood =
        selectedFoods.size() != foodQuantities.size()
            || selectedFoods.stream().anyMatch(food -> !Boolean.TRUE.equals(food.getActive()));

    if (hasUnavailableFood) {
      throw new AppException(ErrorCode.FOOD_NOT_FOUND);
    }

    return selectedFoods;
  }

  public void requireFoodsAvailableForShowtime(List<Food> foods, Showtime showtime) {
    if (foods.isEmpty()) {
      return;
    }
    Long branchId =
        showtime.getRoom() == null || showtime.getRoom().getBranch() == null
            ? null
            : showtime.getRoom().getBranch().getBranchId();
    boolean hasFoodFromOtherBranch =
        foods.stream()
            .anyMatch(
                food ->
                    food.getBranchId() != null && !Objects.equals(food.getBranchId(), branchId));
    if (hasFoodFromOtherBranch) {
      throw new AppException(ErrorCode.FOOD_NOT_FOUND);
    }
  }

  public BigDecimal calculateFoodTotal(
      List<Food> selectedFoods, Map<Long, Integer> foodQuantities) {
    return selectedFoods.stream()
        .map(food -> food.getPrice().multiply(BigDecimal.valueOf(foodQuantities.get(food.getId()))))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  public List<BookingFood> buildBookingFoods(
      Booking booking, List<Food> selectedFoods, Map<Long, Integer> foodQuantities) {
    return selectedFoods.stream()
        .map(
            food -> {
              Integer quantity = foodQuantities.get(food.getId());
              BigDecimal subtotal = food.getPrice().multiply(BigDecimal.valueOf(quantity));
              return BookingFood.builder()
                  .booking(booking)
                  .food(food)
                  .quantity(quantity)
                  .unitPrice(food.getPrice())
                  .subtotal(subtotal)
                  .build();
            })
        .collect(Collectors.toCollection(ArrayList::new));
  }

  public record Price(
      BigDecimal ticketTotal,
      BigDecimal foodTotal,
      BigDecimal discountAmount,
      BigDecimal totalAmount,
      String promotionCode) {}

  public Price price(
      List<Ticket> tickets,
      List<Food> foods,
      Map<Long, Integer> quantities,
      String promotionCode,
      Long customerId,
      Long branchId) {
    BigDecimal ticketTotal =
        tickets.stream().map(Ticket::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal foodTotal = calculateFoodTotal(foods, quantities);
    return discount(ticketTotal, foodTotal, promotionCode, customerId, branchId);
  }

  public Price discount(
      BigDecimal ticketTotal,
      BigDecimal foodTotal,
      String promotionCode,
      Long customerId,
      Long branchId) {
    BigDecimal original = ticketTotal.add(foodTotal);
    if (!StringUtils.hasText(promotionCode)) {
      return new Price(ticketTotal, foodTotal, BigDecimal.ZERO, original, null);
    }
    BigDecimal discount =
        promotionService.validatePromotion(promotionCode, original, customerId, branchId);
    return new Price(
        ticketTotal,
        foodTotal,
        discount,
        original.subtract(discount).max(BigDecimal.ZERO),
        promotionCode.trim().toUpperCase());
  }
}
