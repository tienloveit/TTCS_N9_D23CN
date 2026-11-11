package com.ltweb.backend.service;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.FoodRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quản lý tồn kho bắp nước theo từng món/chi nhánh. Tồn kho null nghĩa là không giới hạn.
 * Tồn được giữ (trừ) ngay khi tạo booking và hoàn lại khi booking bị huỷ/hết hạn.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FoodStockService {
    static final int DEFAULT_LOW_STOCK_THRESHOLD = 10;

    private final FoodRepository foodRepository;
    private final NotificationService notificationService;

    /** Khoá các món và trừ tồn. Ném FOOD_OUT_OF_STOCK nếu không đủ. */
    @Transactional
    public void reserve(List<Food> foods, Map<Long, Integer> quantities) {
        if (foods == null || foods.isEmpty()) {
            return;
        }
        Map<Long, Food> locked = lockFoods(quantities.keySet());
        for (Food requested : foods) {
            Food food = locked.getOrDefault(requested.getId(), requested);
            Integer stock = food.getStockQuantity();
            if (stock == null) {
                continue;
            }
            int quantity = quantities.get(food.getId());
            if (stock < quantity) {
                throw new AppException(ErrorCode.FOOD_OUT_OF_STOCK);
            }
            int remaining = stock - quantity;
            food.setStockQuantity(remaining);
            foodRepository.save(food);
            int threshold = food.getLowStockThreshold() == null
                    ? DEFAULT_LOW_STOCK_THRESHOLD
                    : food.getLowStockThreshold();
            if (remaining <= threshold && stock > threshold || remaining == 0) {
                notificationService.notifyLowStock(food.getBranchId(), food.getId(), food.getName(), remaining);
            }
        }
    }

    /** Hoàn lại tồn của một booking bị huỷ/hết hạn. Chỉ gọi khi booking chuyển PENDING -> CANCELLED. */
    @Transactional
    public void release(Booking booking) {
        if (booking == null || booking.getBookingFoods() == null || booking.getBookingFoods().isEmpty()) {
            return;
        }
        Map<Long, Integer> quantities = booking.getBookingFoods().stream()
                .filter(item -> item.getFood() != null && item.getQuantity() != null)
                .collect(Collectors.toMap(item -> item.getFood().getId(), BookingFood::getQuantity, Integer::sum));
        Map<Long, Food> locked = lockFoods(quantities.keySet());
        for (BookingFood item : booking.getBookingFoods()) {
            if (item.getFood() == null || item.getQuantity() == null) {
                continue;
            }
            Food food = locked.getOrDefault(item.getFood().getId(), item.getFood());
            if (food.getStockQuantity() == null) {
                continue;
            }
            food.setStockQuantity(food.getStockQuantity() + item.getQuantity());
            foodRepository.save(food);
        }
        log.info("Released food stock for booking {}", booking.getBookingCode());
    }

    private Map<Long, Food> lockFoods(java.util.Collection<Long> ids) {
        List<Food> found = foodRepository.findByIdIn(ids);
        return found == null
                ? Map.of()
                : found.stream().collect(Collectors.toMap(Food::getId, Function.identity(), (a, b) -> a));
    }
}

