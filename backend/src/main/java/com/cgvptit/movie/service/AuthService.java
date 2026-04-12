package com.cgvptit.movie.service;

import com.cgvptit.movie.dto.request.LoginRequest;
import com.cgvptit.movie.dto.request.RefreshTokenRequest;
import com.cgvptit.movie.dto.request.RegisterRequest;
import com.cgvptit.movie.dto.response.AuthResponse;
import com.cgvptit.movie.entity.RefreshToken;
import com.cgvptit.movie.entity.Role;
import com.cgvptit.movie.entity.User;
import com.cgvptit.movie.exception.ApiException;
import com.cgvptit.movie.repository.RefreshTokenRepository;
import com.cgvptit.movie.repository.RoleRepository;
import com.cgvptit.movie.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already exists");
        }

        Role customerRole = roleRepository.findByName("CUSTOMER")
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Role CUSTOMER not found"));

        User user = User.builder()
                .role(customerRole)
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .isActive(true)
                .emailVerified(false)
                .points(0)
                .createdAt(LocalDateTime.now())
                .build();

        user = userRepository.save(user);
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is inactive");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken storedToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (Boolean.TRUE.equals(storedToken.getRevoked()) || storedToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token expired or revoked");
        }

        User user = storedToken.getUser();
        UserDetails userDetails = buildUserDetails(user);

        if (!"refresh".equals(jwtService.extractType(storedToken.getToken()))
                || !jwtService.isTokenValid(storedToken.getToken(), userDetails)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        refreshTokenRepository.deleteByUser(user);
        return issueTokens(user);
    }

    private AuthResponse issueTokens(User user) {
        UserDetails userDetails = buildUserDetails(user);
        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        refreshTokenRepository.deleteByUser(user);
        refreshTokenRepository.save(
                RefreshToken.builder()
                        .user(user)
                        .token(refreshToken)
                        .expiresAt(LocalDateTime.now().plusNanos(jwtService.getRefreshTokenExpirationMs() * 1_000_000))
                        .revoked(false)
                        .createdAt(LocalDateTime.now())
                        .build()
        );

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpirationMs())
                .build();
    }

    private UserDetails buildUserDetails(User user) {
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .roles(user.getRole().getName())
                .build();
    }
}
