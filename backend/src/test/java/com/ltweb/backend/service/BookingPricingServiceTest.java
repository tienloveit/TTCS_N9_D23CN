package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.CreateBookingFoodRequest;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.repository.FoodRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class BookingPricingServiceTest {
  private final PromotionService promotions = mock(PromotionService.class);
  private final BookingPricingService pricing =
      new BookingPricingService(mock(FoodRepository.class), promotions);

  @Test
  void quoteIncludesTicketsFoodAndDiscountWithoutStackingEarlierQuotes() {
    List<Ticket> tickets =
        List.of(
            Ticket.builder().price(new BigDecimal("75000")).build(),
            Ticket.builder().price(new BigDecimal("50000")).build());
    List<Food> foods = List.of(Food.builder().id(9L).price(new BigDecimal("20000")).build());
    when(promotions.validatePromotion(" sale ", new BigDecimal("165000"), 1L, 5L))
        .thenReturn(new BigDecimal("10000"));
    var quote = pricing.price(tickets, foods, Map.of(9L, 2), " sale ", 1L, 5L);
    assertThat(quote.ticketTotal()).isEqualByComparingTo("125000");
    assertThat(quote.foodTotal()).isEqualByComparingTo("40000");
    assertThat(quote.totalAmount()).isEqualByComparingTo("155000");
    assertThat(quote.promotionCode()).isEqualTo("SALE");
    assertThat(pricing.price(tickets, foods, Map.of(9L, 2), null, 1L, 5L).totalAmount())
        .isEqualByComparingTo("165000");
    verify(promotions, times(1)).validatePromotion(" sale ", new BigDecimal("165000"), 1L, 5L);
  }

  @Test
  void removedPromotionRestoresOriginalAmountAndDiscountCannotMakeTotalNegative() {
    var removed = pricing.discount(new BigDecimal("100000"), BigDecimal.ZERO, " ", 1L, 5L);
    assertThat(removed.totalAmount()).isEqualByComparingTo("100000");
    assertThat(removed.discountAmount()).isZero();
    assertThat(removed.promotionCode()).isNull();
    when(promotions.validatePromotion("SALE", BigDecimal.TEN, 1L, 5L))
        .thenReturn(new BigDecimal("20"));
    assertThat(pricing.discount(BigDecimal.TEN, BigDecimal.ZERO, "SALE", 1L, 5L).totalAmount())
        .isZero();
  }

  @Test
  void duplicateFoodAndFoodFromAnotherBranchRemainInvalid() {
    CreateBookingFoodRequest food = new CreateBookingFoodRequest();
    food.setFoodId(9L);
    food.setQuantity(1);
    assertThatThrownBy(() -> pricing.getFoodQuantities(List.of(food, food)))
        .isInstanceOf(AppException.class);
    Showtime showtime =
        Showtime.builder()
            .room(Room.builder().branch(Branch.builder().branchId(5L).build()).build())
            .build();
    assertThatThrownBy(
            () ->
                pricing.requireFoodsAvailableForShowtime(
                    List.of(Food.builder().branchId(6L).build()), showtime))
        .isInstanceOf(AppException.class);
  }
}
