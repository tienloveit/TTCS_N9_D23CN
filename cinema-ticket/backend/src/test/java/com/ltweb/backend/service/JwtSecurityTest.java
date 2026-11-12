package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.config.JwtDecoderConfig;
import com.ltweb.backend.dto.TokenPayload;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.UserRepository;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.test.util.ReflectionTestUtils;

@SuppressWarnings("unchecked")
class JwtSecurityTest {
    private static final String SECRET = "synthetic-jwt-test-key-only-".repeat(4);
    private static final String REFRESH_PREFIX = "auth:refresh:active:";
    private static final String REVOKED_PREFIX = "auth:access:revoked:";

    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final ValueOperations<String, String> values = mock(ValueOperations.class);
    private final UserRepository users = mock(UserRepository.class);
    private final Map<String, String> state = new ConcurrentHashMap<>();
    private final Map<String, Duration> ttls = new ConcurrentHashMap<>();
    private final User user = User.builder().username("jwt-review-user").role(UserRole.STAFF)
            .branchId(7L).status(UserStatus.ACTIVE).build();
    private JwtService jwt;
    private JwtDecoderConfig decoder;
    private AuthService auth;

    @BeforeEach
    void setUp() {
        when(redis.opsForValue()).thenReturn(values);
        when(redis.hasKey(anyString())).thenAnswer(call -> state.containsKey(call.getArgument(0)));
        doAnswer(call -> {
            String key = call.getArgument(0);
            Duration ttl = call.getArgument(2);
            assertThat(ttl).isPositive();
            state.put(key, call.getArgument(1));
            ttls.put(key, ttl);
            return null;
        }).when(values).set(anyString(), anyString(), any(Duration.class));
        // Model the atomic compare-and-delete primitive, not a separate GET followed by DEL.
        when(redis.execute(any(DefaultRedisScript.class), anyList(), anyString())).thenAnswer(call -> {
            List<String> keys = call.getArgument(1);
            return state.remove(keys.getFirst(), call.getArgument(2)) ? 1L : 0L;
        });
        jwt = spy(new JwtService(redis));
        ReflectionTestUtils.setField(jwt, "secretKey", SECRET);
        decoder = new JwtDecoderConfig(jwt);
        ReflectionTestUtils.setField(decoder, "secretKey", SECRET);
        auth = new AuthService(null, jwt, users, null, null, null);
        when(users.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
    }

    @Test
    void generatedTokensKeepClaimsLifetimesAndDistinctPurposes() throws Exception {
        TokenPayload access = jwt.generateAccessToken(user);
        TokenPayload refresh = jwt.generateRefreshToken(user);
        JWTClaimsSet a = SignedJWT.parse(access.getToken()).getJWTClaimsSet();
        JWTClaimsSet r = SignedJWT.parse(refresh.getToken()).getJWTClaimsSet();
        assertThat(a.getStringClaim("token_use")).isEqualTo("access");
        assertThat(r.getStringClaim("token_use")).isEqualTo("refresh");
        assertThat(a.getJWTID()).isNotEqualTo(r.getJWTID());
        assertThat(Duration.between(a.getIssueTime().toInstant(), a.getExpirationTime().toInstant()))
                .isEqualTo(Duration.ofMinutes(30));
        assertThat(Duration.between(r.getIssueTime().toInstant(), r.getExpirationTime().toInstant()))
                .isEqualTo(Duration.ofDays(30));
        assertThat(decoder.decode(access.getToken()).getSubject()).isEqualTo(user.getUsername());
        assertThat(a.getStringClaim("role")).isEqualTo("STAFF");
        assertThat(a.getLongClaim("branchId")).isEqualTo(7L);
    }

    @Test
    void refreshIsNeverAnAccessTokenBeforeOrAfterConsumption() {
        TokenPayload refresh = registeredRefresh();
        assertThatThrownBy(() -> decoder.decode(refresh.getToken())).isInstanceOf(BadJwtException.class);
        assertThat(jwt.verifyRefreshToken(refresh.getToken())).isTrue();
        assertThatThrownBy(() -> decoder.decode(refresh.getToken())).isInstanceOf(BadJwtException.class);
        assertInvalid(() -> jwt.verifyRefreshToken(refresh.getToken()));
    }

    @Test
    void loggedOutAccessCannotAuthenticateOrRefreshAndDoesNotTouchRefreshSessions() {
        TokenPayload access = jwt.generateAccessToken(user);
        TokenPayload refresh = registeredRefresh();
        assertInvalid(() -> auth.refresh(access.getToken()));
        auth.logout(access.getToken());
        assertThat(state).containsKey(REVOKED_PREFIX + access.getJwtId());
        assertThat(ttls.get(REVOKED_PREFIX + access.getJwtId()))
                .isPositive().isLessThanOrEqualTo(Duration.ofMinutes(30));
        assertThatThrownBy(() -> decoder.decode(access.getToken())).isInstanceOf(BadJwtException.class);
        assertInvalid(() -> auth.refresh(access.getToken()));
        assertThat(state).containsKey(REFRESH_PREFIX + refresh.getJwtId());
    }

    @Test
    void validRefreshRotatesOnceAndRetiredTokenCannotBeReplayed() {
        TokenPayload refresh = registeredRefresh();
        var pair = auth.refresh(refresh.getToken());
        assertThat(decoder.decode(pair.getAccessToken()).getSubject()).isEqualTo(user.getUsername());
        assertThat(pair.getRefreshToken()).isNotEqualTo(refresh.getToken());
        assertThat(state).doesNotContainKey(REFRESH_PREFIX + refresh.getJwtId());
        assertInvalid(() -> auth.refresh(refresh.getToken()));
        assertThat(auth.refresh(pair.getRefreshToken()).getAccessToken()).isNotBlank();
    }

    @ParameterizedTest
    @EnumSource(value = UserStatus.class, names = {"BLOCKED", "INACTIVE"})
    void disabledAccountCannotObtainNewTokens(UserStatus status) {
        TokenPayload refresh = registeredRefresh();
        user.setStatus(status);
        assertThatThrownBy(() -> auth.refresh(refresh.getToken())).isInstanceOfSatisfying(
                AppException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED));
        verify(jwt, never()).generateAccessToken(any());
        verify(jwt, times(1)).generateRefreshToken(any()); // Only the original fixture token.
        assertThat(state).isEmpty();
    }

    @Test
    void invalidSignatureCannotDestroyLegitimateRefresh() throws Exception {
        TokenPayload refresh = registeredRefresh();
        JWTClaimsSet claims = SignedJWT.parse(refresh.getToken()).getJWTClaimsSet();
        String forged = sign(claims, JWSAlgorithm.HS512, "wrong-synthetic-test-key-".repeat(5));
        clearInvocations(redis, values);
        assertInvalid(() -> jwt.verifyRefreshToken(forged));
        verifyNoInteractions(redis, values);
        assertThat(state).containsKey(REFRESH_PREFIX + refresh.getJwtId());
        assertThat(jwt.verifyRefreshToken(refresh.getToken())).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"exp", "iat", "jti", "sub", "role", "token_use"})
    void missingRequiredClaimsAreRejectedByDecoderWithoutTouchingRedis(String claim) throws Exception {
        JWTClaimsSet incomplete = new JWTClaimsSet.Builder(validClaims("access")).claim(claim, null).build();
        String token = sign(incomplete, JWSAlgorithm.HS512, SECRET);
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(BadJwtException.class);
        verifyNoInteractions(redis, values);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "not-a-jwt", "a.b.c"})
    void malformedAccessAndRefreshAreControlledAuthenticationErrors(String token) {
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(BadJwtException.class);
        assertInvalid(() -> jwt.verifyRefreshToken(token));
        verifyNoInteractions(redis, values);
    }

    @Test
    void expiredOrFutureTokensAreRejectedBeforeRedis() throws Exception {
        Instant now = Instant.now();
        for (JWTClaimsSet claims : List.of(
                new JWTClaimsSet.Builder(validClaims("refresh"))
                        .issueTime(Date.from(now.minusSeconds(120))).expirationTime(Date.from(now.minusSeconds(60))).build(),
                new JWTClaimsSet.Builder(validClaims("refresh"))
                        .issueTime(Date.from(now.plusSeconds(60))).build(),
                new JWTClaimsSet.Builder(validClaims("refresh"))
                        .notBeforeTime(Date.from(now.plusSeconds(60))).build())) {
            String token = sign(claims, JWSAlgorithm.HS512, SECRET);
            assertInvalid(() -> jwt.verifyRefreshToken(token));
        }
        verifyNoInteractions(redis, values);
    }

    @Test
    void wrongAlgorithmAndWrongClaimTypesAreRejected() throws Exception {
        String wrongAlgorithm = sign(validClaims("access"), JWSAlgorithm.HS256, SECRET);
        String wrongRole = sign(new JWTClaimsSet.Builder(validClaims("access"))
                .claim("role", 123).build(), JWSAlgorithm.HS512, SECRET);
        String wrongPurposeType = sign(new JWTClaimsSet.Builder(validClaims("access"))
                .claim("token_use", List.of("access")).build(), JWSAlgorithm.HS512, SECRET);
        for (String token : List.of(wrongAlgorithm, wrongRole, wrongPurposeType)) {
            assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(BadJwtException.class);
        }
        verifyNoInteractions(redis, values);
    }

    @Test
    void missingSessionOrMismatchedOwnerCannotRefresh() {
        TokenPayload refresh = jwt.generateRefreshToken(user);
        assertInvalid(() -> jwt.verifyRefreshToken(refresh.getToken()));
        state.put(REFRESH_PREFIX + refresh.getJwtId(), "another-user");
        assertInvalid(() -> jwt.verifyRefreshToken(refresh.getToken()));
        assertThat(state).containsEntry(REFRESH_PREFIX + refresh.getJwtId(), "another-user");
    }

    @Test
    void concurrentRefreshHasExactlyOneWinner() throws Exception {
        TokenPayload refresh = registeredRefresh();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Boolean> attempt = () -> {
            ready.countDown();
            if (!start.await(5, TimeUnit.SECONDS)) throw new AssertionError("Refresh start timed out");
            try {
                auth.refresh(refresh.getToken());
                return true;
            } catch (AppException e) {
                assertThat(e.getErrorCode()).isEqualTo(ErrorCode.TOKEN_INVALID);
                return false;
            }
        };
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(attempt);
            var second = executor.submit(attempt);
            try {
                assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            } finally {
                start.countDown();
            }
            assertThat(List.of(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        }
        assertThat(state).hasSize(1); // Only the winning request's new refresh session.
    }

    private TokenPayload registeredRefresh() {
        TokenPayload token = jwt.generateRefreshToken(user);
        jwt.registerRefreshToken(token.getToken());
        assertThat(ttls.get(REFRESH_PREFIX + token.getJwtId()))
                .isPositive().isLessThanOrEqualTo(Duration.ofDays(30));
        return token;
    }

    private JWTClaimsSet validClaims(String purpose) {
        Instant now = Instant.now();
        return new JWTClaimsSet.Builder().subject(user.getUsername()).jwtID("synthetic-jti")
                .issueTime(Date.from(now.minusSeconds(1))).expirationTime(Date.from(now.plusSeconds(300)))
                .claim("role", "STAFF").claim("token_use", purpose).build();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"not-a-jwt", "a.b.c"})
    void malformedRefreshIsRejectedThroughAuthService(String token) {
        assertInvalid(() -> auth.refresh(token));
        verifyNoInteractions(redis, values, users);
    }

    private String sign(JWTClaimsSet claims, JWSAlgorithm algorithm, String secret) throws Exception {
        SignedJWT signed = new SignedJWT(new JWSHeader(algorithm), claims);
        signed.sign(new MACSigner(secret));
        return signed.serialize();
    }

    private void assertInvalid(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOfSatisfying(
                AppException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.TOKEN_INVALID));
    }
}
