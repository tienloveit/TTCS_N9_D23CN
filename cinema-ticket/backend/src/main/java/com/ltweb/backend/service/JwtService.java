package com.ltweb.backend.service;

import com.ltweb.backend.dto.JwtInfo;
import com.ltweb.backend.dto.TokenPayload;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class JwtService {
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";
    private static final String REVOKED_ACCESS_PREFIX = "auth:access:revoked:";
    private static final String ACTIVE_REFRESH_PREFIX = "auth:refresh:active:";
    private static final DefaultRedisScript<Long> CONSUME_REFRESH = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            Long.class);

    @Value("${jwt.secret-key}")
    private String secretKey;

    private final StringRedisTemplate redis;

    public TokenPayload generateAccessToken(User user) {
        return getTokenPayload(user, ACCESS, Duration.ofMinutes(30));
    }

    public TokenPayload generateRefreshToken(User user) {
        return getTokenPayload(user, REFRESH, Duration.ofDays(30));
    }

    private TokenPayload getTokenPayload(User user, String tokenUse, Duration lifetime) {
        Instant now = Instant.now();
        Date expiredTime = Date.from(now.plus(lifetime));
        String jwtId = UUID.randomUUID().toString();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(user.getUsername())
                .issueTime(Date.from(now))
                .expirationTime(expiredTime)
                .jwtID(jwtId)
                .claim("token_use", tokenUse)
                .claim("role", user.getRole().name())
                .claim("branchId", user.getBranchId())
                .build();
        SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS512), claims);
        try {
            signedJWT.sign(new MACSigner(secretKey.getBytes(StandardCharsets.UTF_8)));
        } catch (JOSEException e) {
            throw new AppException(ErrorCode.TOKEN_SIGNING_FAILED);
        }
        return TokenPayload.builder().token(signedJWT.serialize()).jwtId(jwtId).expiredTime(expiredTime).build();
    }

    public boolean verifyToken(String token) {
        JWTClaimsSet claims = validate(token, ACCESS);
        if (Boolean.TRUE.equals(redis.hasKey(REVOKED_ACCESS_PREFIX + claims.getJWTID()))) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }
        return true;
    }

    public void registerRefreshToken(String token) {
        JWTClaimsSet claims = validate(token, REFRESH);
        redis.opsForValue().set(
                ACTIVE_REFRESH_PREFIX + claims.getJWTID(),
                claims.getSubject(),
                Duration.between(Instant.now(), claims.getExpirationTime().toInstant()));
    }

    /** Validates and consumes a refresh token exactly once, including across application instances. */
    public boolean verifyRefreshToken(String token) {
        JWTClaimsSet claims = validate(token, REFRESH);
        Long consumed = redis.execute(
                CONSUME_REFRESH, List.of(ACTIVE_REFRESH_PREFIX + claims.getJWTID()), claims.getSubject());
        if (!Long.valueOf(1).equals(consumed)) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }
        return true;
    }

    public void revokeAccessToken(String token) {
        JwtInfo info = parseToken(token);
        Duration remaining = Duration.between(Instant.now(), info.getExpiresTime().toInstant());
        if (!remaining.isNegative() && !remaining.isZero()) {
            redis.opsForValue().set(REVOKED_ACCESS_PREFIX + info.getJwtId(), "1", remaining);
        }
    }

    public JwtInfo parseToken(String token) {
        JWTClaimsSet claims = validate(token, ACCESS);
        return new JwtInfo(claims.getJWTID(), claims.getIssueTime(), claims.getExpirationTime());
    }

    /** No Redis access is allowed before signature, purpose and required claims pass. */
    private JWTClaimsSet validate(String token, String expectedUse) {
        if (!StringUtils.hasText(token)) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            if (!JWSAlgorithm.HS512.equals(signedJWT.getHeader().getAlgorithm())
                    || !signedJWT.verify(new MACVerifier(secretKey.getBytes(StandardCharsets.UTF_8)))) {
                throw new AppException(ErrorCode.TOKEN_INVALID);
            }
            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            Date now = new Date();
            Date expiration = claims.getExpirationTime();
            Date issuedAt = claims.getIssueTime();
            Date notBefore = claims.getNotBeforeTime();
            if (!expectedUse.equals(claims.getStringClaim("token_use"))
                    || !StringUtils.hasText(claims.getSubject())
                    || !StringUtils.hasText(claims.getJWTID())
                    || !StringUtils.hasText(claims.getStringClaim("role"))
                    || expiration == null || !expiration.after(now)
                    || issuedAt == null || issuedAt.after(now) || !expiration.after(issuedAt)
                    || (notBefore != null && notBefore.after(now))) {
                throw new AppException(ErrorCode.TOKEN_INVALID);
            }
            UserRole.valueOf(claims.getStringClaim("role"));
            return claims;
        } catch (ParseException | JOSEException | IllegalArgumentException e) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }
    }
}
