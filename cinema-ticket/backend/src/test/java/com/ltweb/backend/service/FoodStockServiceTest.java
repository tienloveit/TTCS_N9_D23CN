package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.BookingFood;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.FoodRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FoodStockServiceTest {
    @Mock private FoodRepository foodRepository;
    @Mock private NotificationService notificationService;
    @InjectMocks private FoodStockService service;

    private Food food(Integer stock, Integer threshold) {
        return Food.builder().id(1L).name("Popcorn").branchId(7L).stockQuantity(stock)
                .lowStockThreshold(threshold).active(true).build();
    }

    @Test
    void reserveDeductsStock() {
        Food food = food(50, 10);
        when(foodRepository.findByIdIn(any())).thenReturn(List.of(food));

        service.reserve(List.of(food), Map.of(1L, 5));

        assertThat(food.getStockQuantity()).isEqualTo(45);
        verify(notificationService, never()).notifyLowStock(any(), any(), any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void reserveRejectsWhenStockIsInsufficient() {
        Food food = food(2, 10);
        when(foodRepository.findByIdIn(any())).thenReturn(List.of(food));

        assertThatThrownBy(() -> service.reserve(List.of(food), Map.of(1L, 3)))
                .isInstanceOfSatisfying(AppException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.FOOD_OUT_OF_STOCK));
        assertThat(food.getStockQuantity()).isEqualTo(2);
    }

    @Test
    void reserveIgnoresUnlimitedStock() {
        Food food = food(null, null);
        when(foodRepository.findByIdIn(any())).thenReturn(List.of(food));

        service.reserve(List.of(food), Map.of(1L, 100));

        assertThat(food.getStockQuantity()).isNull();
    }

    @Test
    void reserveNotifiesWhenCrossingLowStockThreshold() {
        Food food = food(12, 10);
        when(foodRepository.findByIdIn(any())).thenReturn(List.of(food));

        service.reserve(List.of(food), Map.of(1L, 3));

        verify(notificationService).notifyLowStock(7L, 1L, "Popcorn", 9);
    }

    @Test
    void releaseRestoresStock() {
        Food food = food(4, 10);
        when(foodRepository.findByIdIn(any())).thenReturn(List.of(food));
        Booking booking = Booking.builder().bookingCode("B1").build();
        booking.setBookingFoods(new ArrayList<>(List.of(
                BookingFood.builder().booking(booking).food(food).quantity(6).build())));

        service.release(booking);

        assertThat(food.getStockQuantity()).isEqualTo(10);
    }
}

