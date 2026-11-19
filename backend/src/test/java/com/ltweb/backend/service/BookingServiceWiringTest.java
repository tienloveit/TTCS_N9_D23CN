package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.ltweb.backend.config.TimeConfig;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.*;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;

class BookingServiceWiringTest {
  @Test
  void springCanConstructTheExtractedServicesWithOneApplicationClock() {
    new ApplicationContextRunner()
        .withUserConfiguration(
            TimeConfig.class,
            CurrentUserProvider.class,
            BookingAccessPolicy.class,
            RefundPolicy.class,
            BookingService.class,
            BookingCheckoutService.class,
            BookingCommandService.class,
            BookingQueryService.class,
            BookingMembershipService.class,
            BookingPricingService.class,
            StaffCustomerService.class,
            BookingRefundService.class)
        .withBean(BookingRepository.class, () -> mock(BookingRepository.class))
        .withBean(ShowtimeRepository.class, () -> mock(ShowtimeRepository.class))
        .withBean(TicketRepository.class, () -> mock(TicketRepository.class))
        .withBean(FoodRepository.class, () -> mock(FoodRepository.class))
        .withBean(UserRepository.class, () -> mock(UserRepository.class))
        .withBean(RedisTemplate.class, () -> mock(RedisTemplate.class))
        .withBean(SimpMessagingTemplate.class, () -> mock(SimpMessagingTemplate.class))
        .withBean(BookingMapper.class, () -> mock(BookingMapper.class))
        .withBean(PasswordEncoder.class, () -> mock(PasswordEncoder.class))
        .withBean(ApplicationEventPublisher.class, () -> mock(ApplicationEventPublisher.class))
        .withBean(PromotionService.class, () -> mock(PromotionService.class))
        .withBean(AuditLogService.class, () -> mock(AuditLogService.class))
        .withBean(SystemSettingService.class, () -> mock(SystemSettingService.class))
        .withBean(NotificationService.class, () -> mock(NotificationService.class))
        .withBean(FoodStockService.class, () -> mock(FoodStockService.class))
        .withBean(VnpayRefundGateway.class, () -> mock(VnpayRefundGateway.class))
        .withBean(PlatformTransactionManager.class, () -> mock(PlatformTransactionManager.class))
        .withBean(EntityManager.class, () -> mock(EntityManager.class))
        .run(
            context -> {
              assertThat(context)
                  .hasNotFailed()
                  .hasSingleBean(BookingService.class)
                  .hasSingleBean(Clock.class);
              assertThat(context.getBean(Clock.class).getZone())
                  .isEqualTo(ZoneId.of("Asia/Ho_Chi_Minh"));
              verifyNoInteractions(
                  context.getBean(BookingRepository.class),
                  context.getBean(UserRepository.class),
                  context.getBean(VnpayRefundGateway.class));
            });
  }
}
