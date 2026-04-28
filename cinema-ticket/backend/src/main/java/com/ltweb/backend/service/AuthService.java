package com.ltweb.backend.service;

import com.ltweb.backend.dto.JwtInfo;
import com.ltweb.backend.dto.TokenPayload;
import com.ltweb.backend.dto.request.LoginRequest;
import com.ltweb.backend.dto.response.LoginResponse;
import com.ltweb.backend.entity.RedisToken;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.RedisTokenRepository;
import com.ltweb.backend.repository.UserRepository;
import com.nimbusds.jwt.SignedJWT;
import java.text.ParseException;
import java.util.Date;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final RedisTokenRepository redisTokenRepository;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final OTPService otpService;
  private final EmailService emailService;

  public LoginResponse login(LoginRequest loginRequest) {
    UsernamePasswordAuthenticationToken authenticationToken =
        new UsernamePasswordAuthenticationToken(
            loginRequest.getUsername(), loginRequest.getPassword());
    Authentication authentication = authenticationManager.authenticate(authenticationToken);

    User user = (User) authentication.getPrincipal();

    return getLoginResponse(user);
  }

  public void logout(String token) {
    JwtInfo jwtInfo = jwtService.parseToken(token);
    String jwtId = jwtInfo.getJwtId();
    Date expiredTime = jwtInfo.getExpiresTime();
    if (expiredTime.before(new Date())) {
      return;
    }
    long remainingMillis = expiredTime.getTime() - System.currentTimeMillis();
    long ttlSeconds = toTtlSeconds(remainingMillis);
    RedisToken redisToken = new RedisToken(jwtId, ttlSeconds);
    redisTokenRepository.save(redisToken);
  }

  public LoginResponse refresh(String token) {
    SignedJWT signedJWT;
    try {
      signedJWT = SignedJWT.parse(token);
    } catch (ParseException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }

    if (!jwtService.verifyRefreshToken(token)) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }

    String username;
    try {
      username = signedJWT.getJWTClaimsSet().getSubject();
    } catch (ParseException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }

    User user =
        userRepository
            .findByUsername(username)
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

    return getLoginResponse(user);
  }

  public void changePassword(String currentPassword, String newPassword) {
    var context = SecurityContextHolder.getContext();
    String username = Objects.requireNonNull(context.getAuthentication()).getName();
    User user =
        userRepository
            .findByUsername(username)
            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

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

    emailService.sendOtp(email, otp);
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

  private LoginResponse getLoginResponse(User user) {
    TokenPayload accessPayload = jwtService.generateAccessToken(user);
    TokenPayload refreshPayload = jwtService.generateRefreshToken(user);

    long refreshTtlSeconds =
        toTtlSeconds(refreshPayload.getExpiredTime().getTime() - System.currentTimeMillis());
    if (refreshTtlSeconds <= 0) {
      refreshTtlSeconds = 1L;
    }

    redisTokenRepository.save(
        RedisToken.builder()
            .jwtId(refreshPayload.getJwtId())
            .expiredTime(refreshTtlSeconds)
            .build());

    return LoginResponse.builder()
        .accessToken(accessPayload.getToken())
        .refreshToken(refreshPayload.getToken())
        .build();
  }

  private long toTtlSeconds(long remainingMillis) {
    if (remainingMillis <= 0) {
      return 0L;
    }
    return (remainingMillis + 999L) / TimeUnit.SECONDS.toMillis(1);
  }
}
