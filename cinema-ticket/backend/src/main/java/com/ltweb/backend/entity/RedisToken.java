package com.ltweb.backend.entity;

import java.util.concurrent.TimeUnit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@RedisHash("redis_tokens")
@Builder
public class RedisToken {
  @Id private String jwtId;

  @TimeToLive(unit = TimeUnit.SECONDS)
  private Long expiredTime;
}
