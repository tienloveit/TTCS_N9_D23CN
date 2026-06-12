package com.ltweb.backend.config;

import com.ltweb.backend.entity.User;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.UserRepository;
import com.ltweb.backend.service.JwtService;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtDecoderConfig implements JwtDecoder {

  @Value("${jwt.secret-key}")
  private String secretKey;

  private final JwtService jwtService;
  private final UserRepository userRepository;
  private NimbusJwtDecoder nimbusJwtDecoder = null;

  @Override
  public Jwt decode(String token) throws JwtException {
    try {
      if (!jwtService.verifyToken(token)) {
        throw new AppException(ErrorCode.TOKEN_INVALID);
      }
      if (Objects.isNull(nimbusJwtDecoder)) {
        SecretKey secretKeySpec =
            new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HS512");
        nimbusJwtDecoder =
            NimbusJwtDecoder.withSecretKey(secretKeySpec).macAlgorithm(MacAlgorithm.HS512).build();
      }
      Jwt jwt = nimbusJwtDecoder.decode(token);
      validateCurrentUser(jwt);
      return jwt;
    } catch (AppException e) {
      if (ErrorCode.ACCESS_DENIED.equals(e.getErrorCode())) {
        throw new AccessDeniedException(e.getMessage(), e);
      }
      throw new BadJwtException(e.getMessage(), e);
    }
  }

  private void validateCurrentUser(Jwt jwt) {
    String username = jwt.getSubject();
    User user =
        userRepository.findByUsername(username).orElseThrow(() -> new AppException(ErrorCode.TOKEN_INVALID));

    if (!user.isAccountNonLocked() || !user.isEnabled()) {
      throw new AppException(ErrorCode.ACCESS_DENIED);
    }

    String tokenRole = jwt.getClaimAsString("role");
    if (user.getRole() == null || !user.getRole().name().equals(tokenRole)) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }

    Long tokenBranchId = getLongClaim(jwt, "branchId");
    if (!Objects.equals(user.getBranchId(), tokenBranchId)) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }
  }

  private Long getLongClaim(Jwt jwt, String claimName) {
    Object claim = jwt.getClaim(claimName);
    if (claim == null) {
      return null;
    }
    if (claim instanceof Number number) {
      return number.longValue();
    }
    try {
      return Long.valueOf(claim.toString());
    } catch (NumberFormatException e) {
      throw new AppException(ErrorCode.TOKEN_INVALID);
    }
  }
}
