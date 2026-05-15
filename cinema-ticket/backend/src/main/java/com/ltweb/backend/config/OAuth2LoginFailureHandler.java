package com.ltweb.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {
  @Value("${app.oauth2.redirect-failure-url}")
  private String failureUrl;

  @Override
  public void onAuthenticationFailure(
      HttpServletRequest request,
      HttpServletResponse response,
      AuthenticationException exception)
      throws IOException {
    response.sendRedirect(buildFailureRedirect(exception.getMessage()));
  }

  private String buildFailureRedirect(String message) {
    return UriComponentsBuilder.fromUriString(failureUrl)
        .queryParam("oauth2Error", message == null ? "Google login failed" : message)
        .build()
        .encode()
        .toUriString();
  }
}
