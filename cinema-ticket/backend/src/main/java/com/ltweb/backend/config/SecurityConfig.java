package com.ltweb.backend.config;

import com.ltweb.backend.service.CustomUserDetailService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
  private final String[] PUBLIC_ENDPOINT = {
      "/sign-up",
      "/auth/login",
      "/auth/refresh",
      "/v1/vnpay/return",
      "/v1/vnpay/ipn",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/api/v1/cleanup/**",
      "/chat"
  };

  private final CustomUserDetailService userDetailsService;
  private final JwtDecoderConfig jwtDecoderConfig;
  private final AuthenticationEntryPoint authenticationEntryPoint;

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(AbstractHttpConfigurer::disable)
        .authorizeHttpRequests(
            (authorize) -> authorize
                .requestMatchers(PUBLIC_ENDPOINT)
                .permitAll()
                .requestMatchers("/v1/cleanup/**")
                .permitAll()
                .requestMatchers("/ws/**")
                .permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/movie/**")
                .permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/showtime/**")
                .permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/ticket/showtime/**")
                .permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/genre/**")
                .permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/director/**")
                .permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/food/**")
                .permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/branch/**")
                .permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/room/**")
                .permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/user")
                .permitAll()
                .anyRequest()
                .authenticated())
        .exceptionHandling(
            (exception) -> exception.authenticationEntryPoint(authenticationEntryPoint))
        .oauth2ResourceServer(
            (oauth2) -> oauth2
                .authenticationEntryPoint(authenticationEntryPoint)
                .jwt(
                    jwtConfigurer -> jwtConfigurer
                        .decoder(jwtDecoderConfig)
                        .jwtAuthenticationConverter(jwtAuthenticationConverter())));
    return http.build();
  }

  @Bean
  public Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
    authoritiesConverter.setAuthorityPrefix("ROLE_");
    authoritiesConverter.setAuthoritiesClaimName("role");

    JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
    jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
    return jwtAuthenticationConverter;
  }

  @Bean
  public AuthenticationManager authenticationManager() {
    DaoAuthenticationProvider authenticationProvider = new DaoAuthenticationProvider();
    authenticationProvider.setUserDetailsService(userDetailsService);
    authenticationProvider.setPasswordEncoder(passwordEncoder());
    return new ProviderManager(authenticationProvider);
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(
        List.of(
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:3000"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
