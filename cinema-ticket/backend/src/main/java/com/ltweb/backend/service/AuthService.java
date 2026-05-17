package com.ltweb.backend.service;

import com.ltweb.backend.dto.JwtInfo;
import com.ltweb.backend.dto.TokenPayload;
import com.ltweb.backend.dto.request.LoginRequest;
import com.ltweb.backend.dto.response.LoginResponse;
import com.ltweb.backend.entity.RedisToken;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.RedisTokenRepository;
import com.ltweb.backend.repository.UserRepository;
import com.nimbusds.jwt.SignedJWT;
import java.text.ParseException;
import java.util.Date;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
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

  public LoginResponse loginWithGoogle(OAuth2User oAuth2User) {
    String email = oAuth2User.getAttribute("email");
    if (!StringUtils.hasText(email)) {
      throw new AppException(ErrorCode.OAUTH2_EMAIL_MISSING);
    }

    Boolean emailVerified = oAuth2User.getAttribute("email_verified");
    if (Boolean.FALSE.equals(emailVerified)) {
      throw new AppException(ErrorCode.OAUTH2_EMAIL_NOT_VERIFIED);
    }

    User user =
        userRepository
            .findByEmail(email)
            .map(existingUser -> updateGoogleProfile(existingUser, oAuth2User))
            .orElseGet(() -> createGoogleUser(email, oAuth2User));

    if (!user.isAccountNonLocked() || !user.isEnabled()) {
      throw new AppException(ErrorCode.ACCESS_DENIED);
    }

    return getLoginResponse(user);
  }

  private User createGoogleUser(String email, OAuth2User oAuth2User) {
    String fullName = resolveFullName(oAuth2User, email);
    return userRepository.save(
        User.builder()
            .username(generateUniqueUsername(email))
            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
            .fullName(fullName)
            .email(email)
            .role(UserRole.USER)
            .status(UserStatus.ACTIVE)
            .build());
  }

  private User updateGoogleProfile(User user, OAuth2User oAuth2User) {
    boolean changed = false;
    String fullName = resolveFullName(oAuth2User, user.getEmail());
    if (!StringUtils.hasText(user.getFullName()) && StringUtils.hasText(fullName)) {
      user.setFullName(fullName);
      changed = true;
    }
    if (user.getRole() == null) {
      user.setRole(UserRole.USER);
      changed = true;
    }
    if (user.getStatus() == null) {
      user.setStatus(UserStatus.ACTIVE);
      changed = true;
    }
    return changed ? userRepository.save(user) : user;
  }

  private String resolveFullName(OAuth2User oAuth2User, String email) {
    String name = oAuth2User.getAttribute("name");
    if (StringUtils.hasText(name)) {
      return name;
    }
    return emailLocalPart(email);
  }

  private String generateUniqueUsername(String email) {
    String localPart = emailLocalPart(email);
    String baseUsername = localPart.replaceAll("[^A-Za-z0-9_]", "_");
    if (!StringUtils.hasText(baseUsername)) {
      baseUsername = "google_user";
    }

    String username = baseUsername;
    int suffix = 1;
    while (userRepository.existsByUsername(username)) {
      username = baseUsername + suffix;
      suffix++;
    }
    return username;
  }

  private String emailLocalPart(String email) {
    int atIndex = email.indexOf('@');
    if (atIndex <= 0) {
      return email;
    }
    return email.substring(0, atIndex);
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
