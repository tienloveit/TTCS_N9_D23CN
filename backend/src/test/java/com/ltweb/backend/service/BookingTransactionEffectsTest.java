package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.exception.AppException;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@SuppressWarnings("unchecked")
class BookingTransactionEffectsTest {
  RedisTemplate<String, String> redis = mock(RedisTemplate.class);
  ValueOperations<String, String> values = mock(ValueOperations.class);

  @AfterEach
  void clearSynchronization() {
    if (TransactionSynchronizationManager.isSynchronizationActive())
      TransactionSynchronizationManager.clearSynchronization();
  }

  @Test
  void failedAcquisitionReleasesOnlyKeysThisBookingAcquired() {
    when(redis.opsForValue()).thenReturn(values);
    when(values.setIfAbsent(anyString(), anyString(), anyLong(), any())).thenReturn(true, false);
    assertThatThrownBy(
            () ->
                BookingTransactionEffects.acquire(
                    redis, 3L, List.of(ticket(1L), ticket(2L)), "BK-OWNER", 6))
        .isInstanceOf(AppException.class);
    verify(redis)
        .execute(any(DefaultRedisScript.class), eq(List.of("seat_hold:3:1")), eq("BK-OWNER"));
    verify(redis, never())
        .execute(any(DefaultRedisScript.class), eq(List.of("seat_hold:3:2")), anyString());
    verify(redis, never()).delete(anyCollection());
  }

  @Test
  void databaseRollbackReleasesOwnedHold() {
    TransactionSynchronizationManager.initSynchronization();
    when(redis.opsForValue()).thenReturn(values);
    when(values.setIfAbsent(anyString(), anyString(), anyLong(), any())).thenReturn(true);
    BookingTransactionEffects.acquire(redis, 3L, List.of(ticket(1L)), "BK-OWNER", 6);
    verify(redis, never()).execute(any(DefaultRedisScript.class), anyList(), anyString());
    TransactionSynchronizationManager.getSynchronizations()
        .forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
    verify(redis)
        .execute(any(DefaultRedisScript.class), eq(List.of("seat_hold:3:1")), eq("BK-OWNER"));
  }

  @Test
  void seatBroadcastWaitsForCommit() {
    TransactionSynchronizationManager.initSynchronization();
    AtomicBoolean sent = new AtomicBoolean();
    BookingTransactionEffects.afterCommit(() -> sent.set(true));
    assertThat(sent).isFalse();
    TransactionSynchronizationManager.getSynchronizations()
        .forEach(TransactionSynchronization::afterCommit);
    assertThat(sent).isTrue();
  }

  @Test
  void failedBroadcastDoesNotFailCommittedBookingOrSkipHoldRelease() {
    TransactionSynchronizationManager.initSynchronization();
    BookingTransactionEffects.afterCommit(
        () -> {
          throw new IllegalStateException("Broker unavailable");
        });
    BookingTransactionEffects.releaseAfterCommit(redis, 3L, List.of(ticket(1L)), "BK-OWNER");

    assertThatCode(
            () ->
                TransactionSynchronizationManager.getSynchronizations()
                    .forEach(TransactionSynchronization::afterCommit))
        .doesNotThrowAnyException();
    verify(redis)
        .execute(any(DefaultRedisScript.class), eq(List.of("seat_hold:3:1")), eq("BK-OWNER"));
  }

  private Ticket ticket(Long seatId) {
    return Ticket.builder().seat(Seat.builder().id(seatId).build()).build();
  }
}
