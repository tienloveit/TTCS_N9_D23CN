package com.ltweb.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * ChatMemory implementation that tries Redis first, falls back to in-memory
 * if Redis is unavailable.
 */
@Service
@Slf4j
public class RedisChatMemory implements ChatMemory {

    private final RedisTemplate<String, Object> aiRedisTemplate;
    private static final String KEY_PREFIX = "chat:memory:";
    private static final long TTL_HOURS = 24;

    // In-memory fallback when Redis is not available
    private final Map<String, List<Message>> inMemoryStore = new ConcurrentHashMap<>();
    private volatile boolean redisAvailable = true;

    public RedisChatMemory(RedisTemplate<String, Object> aiRedisTemplate) {
        this.aiRedisTemplate = aiRedisTemplate;
        // Check Redis connectivity at startup
        try {
            aiRedisTemplate.getConnectionFactory().getConnection().ping();
            log.info("Redis is available, using Redis-backed chat memory.");
        } catch (Exception e) {
            redisAvailable = false;
            log.warn("Redis is NOT available, falling back to in-memory chat memory. Reason: {}", e.getMessage());
        }
    }

    @Override
    public void add(String conversationId, List<Message> messages) {
        if (redisAvailable) {
            try {
                String key = KEY_PREFIX + conversationId;
                for (Message message : messages) {
                    aiRedisTemplate.opsForList().rightPush(key, message);
                }
                aiRedisTemplate.expire(key, TTL_HOURS, TimeUnit.HOURS);
                return;
            } catch (Exception e) {
                log.warn("Redis write failed, falling back to in-memory: {}", e.getMessage());
                redisAvailable = false;
            }
        }
        // In-memory fallback
        inMemoryStore.computeIfAbsent(conversationId, k -> new ArrayList<>()).addAll(messages);
    }

    @Override
    public List<Message> get(String conversationId, int lastN) {
        if (redisAvailable) {
            try {
                String key = KEY_PREFIX + conversationId;
                List<Object> list = aiRedisTemplate.opsForList().range(key, -lastN, -1);
                List<Message> messages = new ArrayList<>();
                if (list != null) {
                    for (Object obj : list) {
                        if (obj instanceof Message) {
                            messages.add((Message) obj);
                        }
                    }
                }
                return messages;
            } catch (Exception e) {
                log.warn("Redis read failed, falling back to in-memory: {}", e.getMessage());
                redisAvailable = false;
            }
        }
        // In-memory fallback
        List<Message> all = inMemoryStore.getOrDefault(conversationId, new ArrayList<>());
        if (all.size() <= lastN) {
            return new ArrayList<>(all);
        }
        return new ArrayList<>(all.subList(all.size() - lastN, all.size()));
    }

    @Override
    public void clear(String conversationId) {
        if (redisAvailable) {
            try {
                String key = KEY_PREFIX + conversationId;
                aiRedisTemplate.delete(key);
                return;
            } catch (Exception e) {
                log.warn("Redis delete failed, falling back to in-memory: {}", e.getMessage());
                redisAvailable = false;
            }
        }
        // In-memory fallback
        inMemoryStore.remove(conversationId);
    }
}
