package com.ltweb.backend.service;

import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import java.security.SecureRandom;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OTPService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final StringRedisTemplate stringRedisTemplate;

    public String generateOTP(String email) {
        String limitKey = "otp:limit:" + email;
        String codeKey = "otp:code:" + email;

        Long count = stringRedisTemplate.opsForValue().increment(limitKey);
        // Luôn reset TTL về 1 phút sau mỗi lần increment
        stringRedisTemplate.expire(limitKey, Duration.ofMinutes(1));

        if (count > 5) {
            throw new AppException(ErrorCode.OTP_RATE_LIMIT);
        }

        // sinh OTP và lưu vào Redis
        String generateOtp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
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
