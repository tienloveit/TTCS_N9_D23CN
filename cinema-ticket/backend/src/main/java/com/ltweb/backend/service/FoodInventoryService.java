package com.ltweb.backend.service;

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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FoodInventoryService {
    private final FoodRepository foodRepository;
    private final FoodStockTransactionRepository stockTransactionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public void requireAvailable(List<Food> foods, Map<Long, Integer> quantities) {
        if (foods.isEmpty()) {
            return;
        }
        for (Food food : foods) {
            requireEnoughStock(food, quantities.get(food.getId()));
        }
    }

    @Transactional
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
                int before = food.getStockQuantity();
                food.setStockQuantity(food.getStockQuantity() - entry.getValue());
                recordTransaction(
                        food,
                        FoodStockTransactionType.SALE,
                        before,
                        -entry.getValue(),
                        food.getStockQuantity(),
                        "Sale for booking " + booking.getBookingCode(),
                        booking.getId(),
                        "Booking");
            }
        }
        foodRepository.saveAll(lockedFoods.values());
    }

    @Transactional
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
                int before = food.getStockQuantity();
                food.setStockQuantity(food.getStockQuantity() + entry.getValue());
                recordTransaction(
                        food,
                        FoodStockTransactionType.REFUND,
                        before,
                        entry.getValue(),
                        food.getStockQuantity(),
                        "Refund for booking " + booking.getBookingCode(),
                        booking.getId(),
                        "Booking");
            }
        }
        foodRepository.saveAll(lockedFoods.values());
    }

    @Transactional
    public Food adjustStock(Long foodId, Integer quantityChange, boolean setAbsoluteQuantity, String note) {
        Food food = foodRepository.findById(foodId).orElseThrow(() -> new AppException(ErrorCode.FOOD_NOT_FOUND));
        requireFoodAccess(food);
        if (food.getStockQuantity() == null) {
            food.setStockQuantity(0);
        }
        int before = food.getStockQuantity();
        int nextQuantity = setAbsoluteQuantity ? quantityChange : before + quantityChange;
        if (nextQuantity < 0) {
            throw new AppException(ErrorCode.FOOD_OUT_OF_STOCK);
        }
        int change = nextQuantity - before;
        food.setStockQuantity(nextQuantity);
        Food saved = foodRepository.save(food);
        recordTransaction(
                saved,
                change >= 0 ? FoodStockTransactionType.IMPORT : FoodStockTransactionType.ADJUSTMENT,
                before,
                change,
                nextQuantity,
                note,
                null,
                null);
        return saved;
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
        Map<Long, Food> foods = foodRepository.findByIdIn(foodIds).stream()
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

    private void recordTransaction(
            Food food,
            FoodStockTransactionType type,
            Integer before,
            Integer change,
            Integer after,
            String note,
            Long referenceId,
            String referenceType) {
        stockTransactionRepository.save(
                FoodStockTransaction.builder()
                        .food(food)
                        .branchId(food.getBranchId())
                        .type(type)
                        .quantityBefore(before)
                        .quantityChange(change)
                        .quantityAfter(after)
                        .note(note)
                        .referenceId(referenceId)
                        .referenceType(referenceType)
                        .createdBy(getCurrentUserOrNull())
                        .build());
        if (after != null
                && food.getLowStockThreshold() != null
                && after <= food.getLowStockThreshold()) {
            notificationService.notifyLowStock(food.getBranchId(), food.getId(), food.getName(), after);
        }
    }

    private void requireFoodAccess(Food food) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.ADMIN) {
            return;
        }
        if (user.getRole() == UserRole.MANAGER
                && user.getBranchId() != null
                && Objects.equals(user.getBranchId(), food.getBranchId())) {
            return;
        }
        throw new AccessDeniedException("Food access denied");
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
