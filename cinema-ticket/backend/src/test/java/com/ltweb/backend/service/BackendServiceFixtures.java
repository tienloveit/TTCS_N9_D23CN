package com.ltweb.backend.service;

import static org.mockito.Mockito.*;

import com.ltweb.backend.config.TimeConfig;
import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.mapper.*;
import com.ltweb.backend.repository.*;
import java.time.Clock;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.RestTemplate;

/** Real service graphs with mocked I/O boundaries; no reflective field injection. */
final class BackendServiceFixtures {
  static final Clock CLOCK = new TimeConfig().applicationClock();

  private BackendServiceFixtures() {}

  static SystemSettingService settings() {
    return mock(
        SystemSettingService.class,
        invocation ->
            invocation.getMethod().getName().equals("getInt")
                ? invocation.getArgument(1)
                : RETURNS_DEFAULTS.answer(invocation));
  }

  static BookingService booking(
      BookingRepository bookings, UserRepository users, BookingMapper mapper) {
    return booking(
        bookings,
        mock(ShowtimeRepository.class),
        mock(TicketRepository.class),
        mock(FoodRepository.class),
        users,
        mock(RedisTemplate.class),
        mock(SimpMessagingTemplate.class),
        mapper,
        mock(PasswordEncoder.class),
        mock(ApplicationEventPublisher.class),
        mock(PromotionService.class),
        mock(AuditLogService.class),
        settings(),
        mock(NotificationService.class),
        mock(FoodStockService.class),
        mock(BookingRefundService.class));
  }

  static BookingService booking(
      BookingRepository bookings,
      ShowtimeRepository showtimes,
      TicketRepository tickets,
      FoodRepository foods,
      UserRepository users,
      RedisTemplate<String, String> redis,
      SimpMessagingTemplate messaging,
      BookingMapper mapper,
      PasswordEncoder encoder,
      ApplicationEventPublisher events,
      PromotionService promotions,
      AuditLogService audit,
      SystemSettingService settings,
      NotificationService notifications,
      FoodStockService stock,
      BookingRefundService refunds) {
    CurrentUserProvider current = new CurrentUserProvider(users);
    BookingAccessPolicy access = new BookingAccessPolicy();
    RefundPolicy policy = new RefundPolicy(settings, CLOCK);
    BookingPricingService pricing = new BookingPricingService(foods, promotions);
    return new BookingService(
        new BookingCheckoutService(
            current,
            access,
            pricing,
            new StaffCustomerService(users, encoder),
            CLOCK,
            bookings,
            showtimes,
            tickets,
            redis,
            messaging,
            mapper,
            events,
            audit,
            settings,
            stock),
        new BookingCommandService(
            current,
            access,
            policy,
            pricing,
            CLOCK,
            bookings,
            tickets,
            redis,
            messaging,
            mapper,
            notifications,
            stock),
        new BookingQueryService(bookings, mapper, current, access, policy),
        new BookingMembershipService(bookings, users, promotions),
        refunds);
  }

  static BookingRefundService refund(
      BookingRepository bookings,
      TicketRepository tickets,
      UserRepository users,
      BookingMapper mapper,
      AuditLogService audit,
      SimpMessagingTemplate messaging,
      VnpayRefundGateway gateway,
      PlatformTransactionManager transactions,
      jakarta.persistence.EntityManager entityManager) {
    return new BookingRefundService(
        new CurrentUserProvider(users),
        new BookingAccessPolicy(),
        new RefundPolicy(settings(), CLOCK),
        CLOCK,
        bookings,
        tickets,
        users,
        mapper,
        audit,
        messaging,
        gateway,
        transactions,
        entityManager);
  }

  static VnpayService vnpay(
      VnpayProperties props,
      RestTemplate http,
      BookingRepository bookings,
      TicketRepository tickets,
      RedisTemplate<String, String> redis,
      SimpMessagingTemplate messaging,
      ApplicationEventPublisher events,
      FoodStockService stock,
      UserRepository users,
      BookingRefundService refunds) {
    return new VnpayService(
        new CurrentUserProvider(users),
        new BookingAccessPolicy(),
        CLOCK,
        props,
        http,
        bookings,
        tickets,
        redis,
        messaging,
        events,
        stock,
        refunds);
  }

  static TicketService ticket(
      TicketRepository tickets,
      BookingRepository bookings,
      ShowtimeRepository showtimes,
      SeatRepository seats,
      UserRepository users,
      StringRedisTemplate redis,
      TicketMapper mapper,
      QRCodeReaderService qrReader,
      AuditLogService audit) {
    return new TicketService(
        new CurrentUserProvider(users),
        CLOCK,
        tickets,
        bookings,
        showtimes,
        seats,
        redis,
        mapper,
        qrReader,
        audit);
  }

  static UserService user(
      UserRepository users, BranchRepository branches, UserMapper mapper, PasswordEncoder encoder) {
    return new UserService(new CurrentUserProvider(users), users, branches, mapper, encoder);
  }

  static AuthService auth(
      AuthenticationManager manager,
      JwtService jwt,
      UserRepository users,
      PasswordEncoder encoder,
      OTPService otp,
      EmailService email) {
    return new AuthService(
        new PasswordRecoveryService(users, encoder, otp, email, new CurrentUserProvider(users)),
        manager,
        jwt,
        users,
        encoder);
  }
}
