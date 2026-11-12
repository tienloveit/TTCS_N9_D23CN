package com.ltweb.backend.service;

import com.ltweb.backend.entity.User;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordRecoveryService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final OTPService otpService;
  private final EmailService emailService;
  private final CurrentUserProvider currentUserProvider;

  public void changePassword(String currentPassword, String newPassword) {
    User user = currentUserProvider.requireUser();

    if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
      throw new AppException(ErrorCode.PASSWORD_INCORRECT);
    }

    user.setPassword(passwordEncoder.encode(newPassword));
    userRepository.save(user);
  }

  public void forgotPassword(String email) {
    if (!userRepository.existsByEmail(email)) {
      throw new AppException(ErrorCode.USER_NOT_FOUND);
    }

    String otp = otpService.generateOTP(email);

    try {
      emailService.sendOtp(email, otp);
      log.info("OTP sent successfully to: {}", email);
    } catch (Exception e) {
      log.error("Failed to send OTP to {}: {}", email, e.getMessage(), e);
      throw new AppException(ErrorCode.INTERNAL_ERROR);
    }
  }

  public void resetPassword(String email, String otp, String newPassword) {
    if (!otpService.checkOTP(email, otp)) {
      throw new AppException(ErrorCode.OTP_INVALID);
    }

    User user =
        userRepository
            .findByEmail(email)
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

    user.setPassword(passwordEncoder.encode(newPassword));
    userRepository.save(user);

    otpService.deleteOTP(email);
  }
}
