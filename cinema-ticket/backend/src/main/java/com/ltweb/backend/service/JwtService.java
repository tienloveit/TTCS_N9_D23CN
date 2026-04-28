package com.ltweb.backend.service;

import com.ltweb.backend.dto.JwtInfo;
import com.ltweb.backend.dto.TokenPayload;
import com.ltweb.backend.entity.RedisToken;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.RedisTokenRepository;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSObject;
import com.nimbusds.jose.Payload;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class JwtService {

  @Value("${jwt.secret-key}")
  private String secretKey;

  private final RedisTokenRepository redisTokenRepository;

  public TokenPayload generateAccessToken(User user) {
    JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

    Date issueTime = new Date();
    Date expiredTime = Date.from(issueTime.toInstant().plus(30, ChronoUnit.MINUTES));
    return getTokenPayload(user, header, issueTime, expiredTime);
  }

  public TokenPayload generateRefreshToken(User user) {
    JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

    Date issueTime = new Date();
    Date expiredTime = Date.from(issueTime.toInstant().plus(30, ChronoUnit.DAYS));
    return getTokenPayload(user, header, issueTime, expiredTime);
  }

  private TokenPayload getTokenPayload(
      User user, JWSHeader header, Date issueTime, Date expiredTime) {
    String jwtID = UUID.randomUUID().toString();

    JWTClaimsSet claimsSet =
        new JWTClaimsSet.Builder()
            .subject(user.getUsername())
            .issueTime(issueTime)
            .expirationTime(expiredTime)
            .jwtID(jwtID)
            .claim("role", user.getRole().name())
            .build();

    Payload payload = new Payload(claimsSet.toJSONObject());

    JWSObject jwsObject = new JWSObject(header, payload);

    try {
      jwsObject.sign(new MACSigner(secretKey));
    } catch (JOSEException e) {
      throw new AppException(ErrorCode.TOKEN_SIGNING_FAILED);
    }

    String token = jwsObject.serialize();
    return TokenPayload.builder().token(token).jwtId(jwtID).expiredTime(expiredTime).build();
  }

  public boolean verifyToken(String token) {
    SignedJWT signedJWT;
    try {
      signedJWT = SignedJWT.parse(token);
    } catch (java.text.ParseException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }

    Date expirationTime;
    String jwtId;
    try {
      expirationTime = signedJWT.getJWTClaimsSet().getExpirationTime();
      jwtId = signedJWT.getJWTClaimsSet().getJWTID();
    } catch (java.text.ParseException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }
    if (expirationTime.before(new Date())) {
      return false;
    }

    Optional<RedisToken> redisToken = redisTokenRepository.findById(jwtId);

    if (redisToken.isPresent()) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }
    try {
      return signedJWT.verify(new MACVerifier(secretKey));
    } catch (JOSEException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }
  }

  public boolean verifyRefreshToken(String token) {
    SignedJWT signedJWT;
    try {
      signedJWT = SignedJWT.parse(token);
    } catch (java.text.ParseException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }

    Date expirationTime;
    String jwtId;
    try {
      expirationTime = signedJWT.getJWTClaimsSet().getExpirationTime();
      jwtId = signedJWT.getJWTClaimsSet().getJWTID();
    } catch (java.text.ParseException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }
    if (expirationTime.before(new Date())) {
      return false;
    }

    Optional<RedisToken> redisToken = redisTokenRepository.findById(jwtId);
    if (redisToken.isEmpty()) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }
    redisTokenRepository.deleteById(jwtId);
    try {
      return signedJWT.verify(new MACVerifier(secretKey));
    } catch (JOSEException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }
  }

  public JwtInfo parseToken(String token) {
    SignedJWT signedJWT;
    try {
      signedJWT = SignedJWT.parse(token);
    } catch (java.text.ParseException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }
    String jwtId;
    Date issueTime;
    Date expiredTime;
    try {
      jwtId = signedJWT.getJWTClaimsSet().getJWTID();
      issueTime = signedJWT.getJWTClaimsSet().getIssueTime();
      expiredTime = signedJWT.getJWTClaimsSet().getExpirationTime();
    } catch (java.text.ParseException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }

    return new JwtInfo(jwtId, issueTime, expiredTime);
  }
}
