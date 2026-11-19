package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import java.time.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

class ClockedJwtServiceTest {
  private final Clock clock =
      Clock.fixed(Instant.parse("2035-01-01T00:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
  private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
  private final User user = User.builder().username("customer").role(UserRole.USER).build();

  private JwtService service(Clock time) {
    JwtService service = new JwtService(time, redis);
    ReflectionTestUtils.setField(service, "secretKey", "synthetic-test-secret-".repeat(5));
    return service;
  }

  @Test
  void issuanceValidationAndRevocationAllUseTheInjectedClock() {
    ValueOperations<String, String> values = mock(ValueOperations.class);
    when(redis.opsForValue()).thenReturn(values);
    JwtService service = service(clock);
    String token = service.generateAccessToken(user).getToken();
    var info = service.parseToken(token);
    assertThat(info.getIssuedTime().toInstant()).isEqualTo(clock.instant());
    assertThat(info.getExpiresTime().toInstant())
        .isEqualTo(clock.instant().plus(Duration.ofMinutes(30)));
    service.revokeAccessToken(token);
    verify(values).set("auth:access:revoked:" + info.getJwtId(), "1", Duration.ofMinutes(30));
    assertThatThrownBy(() -> service(Clock.offset(clock, Duration.ofMinutes(30))).parseToken(token))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.TOKEN_INVALID);
  }
}
