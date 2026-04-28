package com.ltweb.backend.config;

import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.service.JwtService;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
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
    } catch (AppException e) {
      if (ErrorCode.ACCESS_DENIED.equals(e.getErrorCode())) {
        throw new AccessDeniedException(e.getMessage(), e);
      }
      throw new JwtException(e.getMessage(), e);
    }
    return nimbusJwtDecoder.decode(token);
  }
}
