package com.ltweb.backend.service;

import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** External seat updates follow the database transaction; a hold belongs to one booking. */
@Slf4j
public final class BookingTransactionEffects {
    private static final DefaultRedisScript<Long> RELEASE_OWN_HOLD = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            Long.class);

    private BookingTransactionEffects() {}

    public static void afterCommit(Runnable action) {
        Runnable bestEffort = () -> {
            try {
                action.run();
            } catch (RuntimeException failure) {
                // The database has committed. Keep later notifications and hold releases running.
                log.warn("Post-commit seat update failed", failure);
            }
        };
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            bestEffort.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { bestEffort.run(); }
        });
    }

    static void acquire(RedisTemplate<String, String> redis, Long showtimeId,
            List<Ticket> tickets, String owner, int minutes) {
        List<String> acquired = new ArrayList<>();
        try {
            for (Ticket ticket : tickets) {
                String key = key(showtimeId, ticket);
                if (!Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(key, owner, minutes, TimeUnit.MINUTES))) {
                    throw new AppException(ErrorCode.TICKET_NOT_AVAILABLE);
                }
                acquired.add(key);
            }
        } catch (RuntimeException failure) {
            release(redis, acquired, owner);
            throw failure;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) release(redis, acquired, owner);
                }
            });
        }
    }

    public static void releaseAfterCommit(RedisTemplate<String, String> redis, Long showtimeId,
            List<Ticket> tickets, String owner) {
        List<String> keys = tickets.stream().map(ticket -> key(showtimeId, ticket)).toList();
        afterCommit(() -> release(redis, keys, owner));
    }

    private static String key(Long showtimeId, Ticket ticket) {
        return "seat_hold:" + showtimeId + ":" + ticket.getSeat().getId();
    }

    private static void release(RedisTemplate<String, String> redis, List<String> keys, String owner) {
        for (String key : keys) {
            try {
                redis.execute(RELEASE_OWN_HOLD, List.of(key), owner);
            } catch (RuntimeException ignored) {
                // The DB remains authoritative; a Redis outage is bounded by the hold TTL.
            }
        }
    }
}
