package com.ltweb.backend.config;

import com.ltweb.backend.service.CustomUserDetailService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationProvider;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
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
    "/auth/logout",
    "/v1/vnpay/return",
    "/v1/vnpay/ipn",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/oauth2/**",
    "/login/oauth2/**"
  };

  private final CustomUserDetailService userDetailsService;
  private final JwtDecoderConfig jwtDecoderConfig;
  private final AuthenticationEntryPoint authenticationEntryPoint;
  private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
  private final OAuth2LoginFailureHandler oAuth2LoginFailureHandler;

  /** Origin của frontend, khai báo một lần ở app.cors.allowed-origins và dùng chung với /ws. */
  @Value("${app.cors.allowed-origins:}")
  private String[] allowedOrigins = new String[0];

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    JwtAuthenticationProvider jwtProvider = new JwtAuthenticationProvider(jwtDecoderConfig);
    jwtProvider.setJwtAuthenticationConverter(jwtAuthenticationConverter());

    http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(AbstractHttpConfigurer::disable)
        .authorizeHttpRequests(
            (authorize) ->
                authorize
                    .requestMatchers(PUBLIC_ENDPOINT)
                    .permitAll()
                    .requestMatchers("/v1/cleanup/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/v1/vnpay/querydr", "/v1/vnpay/refund")
                    .hasAnyRole("ADMIN", "MANAGER")
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
        .oauth2Login(
            oauth2 ->
                oauth2
                    .successHandler(oAuth2LoginSuccessHandler)
                    .failureHandler(oAuth2LoginFailureHandler))
        .exceptionHandling(
            (exception) ->
                exception
                    .authenticationEntryPoint(authenticationEntryPoint)
                    .defaultAccessDeniedHandlerFor(
                        new BearerTokenAccessDeniedHandler(),
                        request ->
                            SecurityContextHolder.getContext().getAuthentication()
                                instanceof JwtAuthenticationToken))
        .addFilterAt(
            new JwtAuthenticationFilter(jwtProvider, authenticationEntryPoint),
            BearerTokenAuthenticationFilter.class);
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
    config.setAllowedOrigins(List.of(allowedOrigins));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
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
