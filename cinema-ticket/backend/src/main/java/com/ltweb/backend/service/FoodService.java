package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateFoodRequest;
import com.ltweb.backend.dto.request.UpdateFoodRequest;
import com.ltweb.backend.dto.response.FoodResponse;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.FoodRepository;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FoodService {

  private final FoodRepository foodRepository;

  @PreAuthorize("hasRole('ADMIN')")
  public FoodResponse createFood(CreateFoodRequest request) {
    Food food =
        Food.builder()
            .name(request.getName())
            .description(request.getDescription())
            .price(request.getPrice())
            .imageUrl(request.getImageUrl())
            .active(request.getActive() == null || request.getActive())
            .build();

    return toFoodResponse(foodRepository.save(food));
  }

  public List<FoodResponse> getAvailableFoods() {
    return foodRepository.findByActiveTrueOrderByNameAsc().stream()
        .map(this::toFoodResponse)
        .toList();
  }

  @PreAuthorize("hasRole('ADMIN')")
  public List<FoodResponse> getAllFoods() {
    return foodRepository.findAll().stream()
        .sorted(Comparator.comparing(Food::getName, String.CASE_INSENSITIVE_ORDER))
        .map(this::toFoodResponse)
        .toList();
  }

  public FoodResponse getFoodById(Long foodId) {
    return toFoodResponse(getFood(foodId));
  }

  @PreAuthorize("hasRole('ADMIN')")
  public FoodResponse updateFood(Long foodId, UpdateFoodRequest request) {
    Food food = getFood(foodId);

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
    if (request.getActive() != null) {
      food.setActive(request.getActive());
    }

    return toFoodResponse(foodRepository.save(food));
  }

  @PreAuthorize("hasRole('ADMIN')")
  public void deleteFood(Long foodId) {
    Food food = getFood(foodId);
    food.setActive(false);
    foodRepository.save(food);
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
        .active(food.getActive())
        .build();
  }
}
