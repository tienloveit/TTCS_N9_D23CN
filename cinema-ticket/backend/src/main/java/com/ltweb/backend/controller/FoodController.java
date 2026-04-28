package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateFoodRequest;
import com.ltweb.backend.dto.request.UpdateFoodRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.FoodResponse;
import com.ltweb.backend.service.FoodService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/food")
@RequiredArgsConstructor
public class FoodController {

  private final FoodService foodService;

  @PostMapping
  public ApiResponse<FoodResponse> createFood(@RequestBody @Valid CreateFoodRequest request) {
    ApiResponse<FoodResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Food created successfully!");
    apiResponse.setResult(foodService.createFood(request));
    return apiResponse;
  }

  @GetMapping
  public ApiResponse<List<FoodResponse>> getAvailableFoods() {
    ApiResponse<List<FoodResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(foodService.getAvailableFoods());
    return apiResponse;
  }

  @GetMapping("/all")
  public ApiResponse<List<FoodResponse>> getAllFoods() {
    ApiResponse<List<FoodResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(foodService.getAllFoods());
    return apiResponse;
  }

  @GetMapping("/{id}")
  public ApiResponse<FoodResponse> getFoodById(@PathVariable("id") Long id) {
    ApiResponse<FoodResponse> apiResponse = new ApiResponse<>();
    apiResponse.setResult(foodService.getFoodById(id));
    return apiResponse;
  }

  @PutMapping("/{id}")
  public ApiResponse<FoodResponse> updateFood(
      @PathVariable("id") Long id, @RequestBody @Valid UpdateFoodRequest request) {
    ApiResponse<FoodResponse> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Food updated successfully!");
    apiResponse.setResult(foodService.updateFood(id, request));
    return apiResponse;
  }

  @DeleteMapping("/{id}")
  public ApiResponse<String> deleteFood(@PathVariable("id") Long id) {
    foodService.deleteFood(id);
    ApiResponse<String> apiResponse = new ApiResponse<>();
    apiResponse.setMessage("Food disabled successfully!");
    return apiResponse;
  }
}
