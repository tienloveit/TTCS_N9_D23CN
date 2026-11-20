package com.ltweb.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationProvider;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.AuthenticationEntryPointFailureHandler;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

public final class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtAuthenticationProvider authenticationProvider;
  private final AuthenticationEntryPoint authenticationEntryPoint;
  private final AuthenticationEntryPointFailureHandler authenticationFailureHandler;
  private final DefaultBearerTokenResolver bearerTokenResolver = new DefaultBearerTokenResolver();
  private final WebAuthenticationDetailsSource detailsSource = new WebAuthenticationDetailsSource();
  private final RequestAttributeSecurityContextRepository contextRepository =
      new RequestAttributeSecurityContextRepository();

  JwtAuthenticationFilter(
      JwtAuthenticationProvider authenticationProvider,
      AuthenticationEntryPoint authenticationEntryPoint) {
    this.authenticationProvider = authenticationProvider;
    this.authenticationEntryPoint = authenticationEntryPoint;
    this.authenticationFailureHandler =
        new AuthenticationEntryPointFailureHandler(authenticationEntryPoint);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String token;
    try {
      token = bearerTokenResolver.resolve(request);
    } catch (OAuth2AuthenticationException exception) {
      authenticationEntryPoint.commence(request, response, exception);
      return;
    }

    if (token == null) {
      filterChain.doFilter(request, response);
      return;
    }

    BearerTokenAuthenticationToken credentials = new BearerTokenAuthenticationToken(token);
    credentials.setDetails(detailsSource.buildDetails(request));
    Authentication authentication;
    try {
      authentication = authenticationProvider.authenticate(credentials);
    } catch (AuthenticationException exception) {
      SecurityContextHolder.clearContext();
      authenticationFailureHandler.onAuthenticationFailure(request, response, exception);
      return;
    }

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    contextRepository.saveContext(context, request, response);
    filterChain.doFilter(request, response);
  }
}
