package com.ltweb.backend.service;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OTPService {
  private final StringRedisTemplate stringRedisTemplate;

  public String generateOTP(String email) {
    String limitKey = "otp:limit:" + email;
    String codeKey =
        "otp:code:" + email; // lưu lại cái mã đó để đối chiếu với người dùng khi nhập vào

    Long count = stringRedisTemplate.opsForValue().increment(limitKey);
    if (count == 1) {
      stringRedisTemplate.expire(limitKey, Duration.ofMinutes(1));
    }

    if (count > 3) {
      throw new RuntimeException("Bạn thao tác quá nhanh. Vui lòng thử lại");
    }

    // sinh OTP và lưu vào Redis
    String generateOtp = String.valueOf(Math.random() * 900000 + 100000);
    stringRedisTemplate.opsForValue().set(codeKey, generateOtp, Duration.ofMinutes(5));
    return generateOtp;
  }

  public boolean checkOTP(String email, String otp) {
    String codeKey = "otp:code:" + email;
    String storedKey = stringRedisTemplate.opsForValue().get(codeKey);
    return storedKey != null && storedKey.equals(otp);
  }

  public void deleteOTP(String email) {
    String codeKey = "otp:code:" + email;
    stringRedisTemplate.delete(codeKey);
  }
}
