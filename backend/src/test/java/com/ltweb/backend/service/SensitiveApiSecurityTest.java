package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ltweb.backend.config.*;
import com.ltweb.backend.controller.AuthController;
import com.ltweb.backend.controller.CleanupController;
import com.ltweb.backend.controller.DirectorController;
import com.ltweb.backend.controller.GenreController;
import com.ltweb.backend.controller.MovieController;
import com.ltweb.backend.controller.ShowtimeController;
import com.ltweb.backend.controller.UserController;
import com.ltweb.backend.controller.VnpayController;
import com.ltweb.backend.dto.response.UserResponse;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import java.time.Clock;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

class SensitiveApiSecurityTest {
  private WebApplicationContextRunner context(String profiles, boolean enabled) {
    return new WebApplicationContextRunner()
        .withInitializer(c -> c.getEnvironment().setActiveProfiles(profiles.split(",")))
        .withPropertyValues("app.maintenance.cleanup-enabled=" + enabled)
        .withUserConfiguration(TestConfig.class);
  }

  @ParameterizedTest
  @ValueSource(strings = {"default", "prod", "dev,prod"})
  void cleanupControllerDoesNotExistOutsideDevelopmentEvenWhenExplicitlyEnabled(String profiles) {
    context(profiles, true)
        .run(
            ctx -> {
              assertThat(ctx).doesNotHaveBean(CleanupController.class);
              mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class))
                  .perform(request("DELETE", "/v1/cleanup/database", "ADMIN"))
                  .andExpect(status().isNotFound());
              verify(ctx.getBean(JdbcTemplate.class), never()).execute(anyString());
              verifyNoInteractions(ctx.getBean(DataSeedService.class));
            });
  }

  @Test
  void cleanupRemainsOffByDefaultInDevelopment() {
    context("dev", false)
        .run(
            ctx -> {
              assertThat(ctx).doesNotHaveBean(CleanupController.class);
              verify(ctx.getBean(JdbcTemplate.class), never()).execute(anyString());
            });
  }

  @Test
  void cleanupRequiresAnAuthenticatedAdminWhenEnabled() {
    context("dev", true)
        .run(
            ctx -> {
              assertThat(ctx).hasSingleBean(CleanupController.class);
              MockMvc mvc =
                  mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
              mvc.perform(request("DELETE", "/v1/cleanup/database", null))
                  .andExpect(status().isUnauthorized());
              for (String role : new String[] {"USER", "STAFF", "MANAGER"}) {
                mvc.perform(request("DELETE", "/v1/cleanup/database", role))
                    .andExpect(status().isForbidden());
              }
              verify(ctx.getBean(JdbcTemplate.class), never()).execute(anyString());
              verifyNoInteractions(ctx.getBean(DataSeedService.class));
              // JDBC and seeding are mocks: this test never resets a real database.
              mvc.perform(request("DELETE", "/v1/cleanup/database", "ADMIN"))
                  .andExpect(status().isOk());
              verify(ctx.getBean(DataSeedService.class)).seedInitialData();
            });
  }

  @Test
  void gatewayManagementRoutesRejectAnonymousCustomersAndStaffBeforeCallingServices() {
    context("default", false)
        .run(
            ctx -> {
              MockMvc mvc =
                  mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
              for (String route : new String[] {"/v1/vnpay/querydr", "/v1/vnpay/refund"}) {
                mvc.perform(request("POST", route, null).content("{}"))
                    .andExpect(status().isUnauthorized());
                for (String role : new String[] {"USER", "STAFF"}) {
                  mvc.perform(request("POST", route, role).content("{}"))
                      .andExpect(status().isForbidden());
                }
              }
              verifyNoInteractions(ctx.getBean(VnpayService.class));
              String body =
                  "{\"orderId\":\"17\",\"transDate\":\"20261112102030\","
                      + "\"trantype\":\"02\",\"amount\":125000,\"user\":\"ignored\"}";
              for (String role : new String[] {"ADMIN", "MANAGER"}) {
                mvc.perform(request("POST", "/v1/vnpay/querydr", role).content(body))
                    .andExpect(status().isOk());
                mvc.perform(request("POST", "/v1/vnpay/refund", role).content(body))
                    .andExpect(status().isOk());
              }
            });
  }

  @Test
  void gatewayCallbacksRemainPublic() {
    context("default", false)
        .run(
            ctx -> {
              MockMvc mvc =
                  mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
              mvc.perform(request("GET", "/v1/vnpay/return", null)).andExpect(status().isOk());
              mvc.perform(request("GET", "/v1/vnpay/ipn", null)).andExpect(status().isOk());
              verify(ctx.getBean(VnpayCallbackService.class)).processReturnUrl(anyMap());
              verify(ctx.getBean(VnpayCallbackService.class)).processIpn(anyMap());
            });
  }

  @Test
  void controllerRoleChecksGuardCatalogShowtimeAndUserManagement() {
    context("default", false)
        .run(
            ctx -> {
              MockMvc mvc =
                  mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
              String[][] adminOnly = {
                {"POST", "/genre", "{\"name\":\"Hành động\"}"},
                {"PUT", "/genre/1", "{\"name\":\"Hành động\"}"},
                {"DELETE", "/genre/1", null},
                {"POST", "/director", "{\"name\":\"Lý Hải\"}"},
                {"PUT", "/director/1", "{\"name\":\"Lý Hải\"}"},
                {"DELETE", "/director/1", null},
                {"DELETE", "/showtime/1", null}
              };
              for (String[] route : adminOnly) {
                for (String role : new String[] {"USER", "STAFF", "MANAGER"}) {
                  mvc.perform(withBody(request(route[0], route[1], role), route[2]))
                      .andExpect(status().isForbidden());
                }
              }
              String[][] adminOrManager = {
                {"GET", "/users", null},
                {"GET", "/users/1", null},
                {"PUT", "/users/1", "{\"fullName\":\"Nhân viên\"}"},
                {"DELETE", "/users/1", null}
              };
              for (String[] route : adminOrManager) {
                for (String role : new String[] {"USER", "STAFF"}) {
                  mvc.perform(withBody(request(route[0], route[1], role), route[2]))
                      .andExpect(status().isForbidden());
                }
              }
              verifyNoInteractions(
                  ctx.getBean(GenreService.class),
                  ctx.getBean(DirectorService.class),
                  ctx.getBean(ShowtimeService.class),
                  ctx.getBean(UserService.class));

              mvc.perform(request("DELETE", "/showtime/1", "ADMIN")).andExpect(status().isOk());
              verify(ctx.getBean(ShowtimeService.class)).delete(1L);
              mvc.perform(request("GET", "/users/1", "MANAGER")).andExpect(status().isOk());
              verify(ctx.getBean(UserService.class)).getUserById(1L);
            });
  }

  private static MockHttpServletRequestBuilder withBody(
      MockHttpServletRequestBuilder request, String body) {
    return body == null ? request : request.content(body);
  }

  @Test
  void customFilterAuthenticatesSignedAccessTokensAndRejectsInvalidBearerCredentials() {
    context("default", false)
        .run(
            ctx -> {
              FilterChainProxy chain = ctx.getBean(FilterChainProxy.class);
              assertThat(chain.getFilters("/my-info"))
                  .filteredOn(JwtAuthenticationFilter.class::isInstance)
                  .hasSize(1);
              assertThat(chain.getFilters("/my-info"))
                  .noneMatch(BearerTokenAuthenticationFilter.class::isInstance);

              String secret = "synthetic-filter-test-key-".repeat(4);
              JwtService jwtService =
                  new JwtService(Clock.systemUTC(), mock(StringRedisTemplate.class));
              JwtDecoderConfig decoder = new JwtDecoderConfig(jwtService);
              ReflectionTestUtils.setField(jwtService, "secretKey", secret);
              ReflectionTestUtils.setField(decoder, "secretKey", secret);
              doAnswer(call -> decoder.decode(call.getArgument(0)))
                  .when(ctx.getBean(JwtDecoderConfig.class))
                  .decode(anyString());
              User user = User.builder().username("customer").role(UserRole.USER).build();
              String accessToken = jwtService.generateAccessToken(user).getToken();
              String refreshToken = jwtService.generateRefreshToken(user).getToken();
              UserService users = AopTestUtils.getTargetObject(ctx.getBean(UserService.class));
              when(users.getMyInfo())
                  .thenReturn(UserResponse.builder().username(user.getUsername()).build());

              MockMvc mvc = mockMvc(ctx.getSourceApplicationContext(), chain);
              mvc.perform(request("GET", "/my-info", accessToken))
                  .andExpect(status().isOk())
                  .andExpect(jsonPath("$.result.username").value("customer"));
              for (String invalidToken : new String[] {null, refreshToken, "malformed bearer"}) {
                mvc.perform(request("GET", "/my-info", invalidToken))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value(401));
              }
              mvc.perform(request("POST", "/v1/vnpay/querydr", accessToken).content("{}"))
                  .andExpect(status().isForbidden())
                  .andExpect(header().exists(HttpHeaders.WWW_AUTHENTICATE));
            });
  }

  @Test
  void publicMovieAndAuthRoutesAllowRequestsWithoutBearerTokens() {
    context("default", false)
        .run(
            ctx -> {
              MockMvc mvc =
                  mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
              mvc.perform(request("GET", "/movie/now-showing", null)).andExpect(status().isOk());
              mvc.perform(request("POST", "/auth/login", null).content("{}"))
                  .andExpect(status().isOk());
              mvc.perform(
                      request("POST", "/auth/refresh", null)
                          .content("{\"refreshToken\":\"submitted-token\"}"))
                  .andExpect(status().isOk());
              verify(ctx.getBean(MovieService.class)).getNowShowingMovies();
              verify(ctx.getBean(AuthService.class)).login(any());
              verify(ctx.getBean(AuthService.class)).refresh("submitted-token");
            });
  }

  @Test
  void logoutWorksWithoutBearerSoAnExpiredSessionCanStillBeEnded() {
    context("default", false)
        .run(
            ctx -> {
              MockMvc mvc =
                  mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
              mvc.perform(
                      request("POST", "/auth/logout", null)
                          .content(
                              "{\"accessToken\":\"submitted-access\","
                                  + "\"refreshToken\":\"submitted-refresh\"}"))
                  .andExpect(status().isOk());
              mvc.perform(request("POST", "/auth/logout", null)).andExpect(status().isOk());
              verify(ctx.getBean(AuthService.class))
                  .logout("submitted-access", "submitted-refresh");
              verify(ctx.getBean(AuthService.class)).logout(null, null);
            });
  }

  @Test
  void googleAuthorizationAndCallbackStillReachOAuth2Filters() {
    context("default", false)
        .run(
            ctx -> {
              MockMvc mvc =
                  mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
              mvc.perform(request("GET", "/oauth2/authorization/google", null))
                  .andExpect(status().is3xxRedirection());
              mvc.perform(
                  request("GET", "/login/oauth2/code/google", null)
                      .param("error", "access_denied"));
              verify(ctx.getBean(OAuth2LoginFailureHandler.class))
                  .onAuthenticationFailure(any(), any(), any());
            });
  }

  private MockHttpServletRequestBuilder request(String method, String path, String role) {
    SecurityContextHolder.clearContext();
    MockHttpServletRequestBuilder request =
        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(
                org.springframework.http.HttpMethod.valueOf(method), "/api" + path)
            .contextPath("/api")
            .servletPath(path)
            .contentType(MediaType.APPLICATION_JSON);
    if (role != null) request.header("Authorization", "Bearer " + role);
    return request;
  }

  private MockMvc mockMvc(
      org.springframework.web.context.WebApplicationContext ctx, FilterChainProxy filter) {
    return MockMvcBuilders.webAppContextSetup(ctx).addFilters(filter).build();
  }

  @Configuration(proxyBeanMethods = false)
  @EnableWebMvc
  @Import({
    SecurityConfig.class,
    AuthController.class,
    CleanupController.class,
    DirectorController.class,
    GenreController.class,
    MovieController.class,
    ShowtimeController.class,
    UserController.class,
    VnpayController.class
  })
  static class TestConfig {
    @Bean
    AuthService auth() {
      return mock(AuthService.class);
    }

    @Bean
    MovieService movies() {
      return mock(MovieService.class);
    }

    @Bean
    UserService users() {
      return mock(UserService.class);
    }

    @Bean
    GenreService genres() {
      return mock(GenreService.class);
    }

    @Bean
    DirectorService directors() {
      return mock(DirectorService.class);
    }

    @Bean
    ShowtimeService showtimes() {
      return mock(ShowtimeService.class);
    }

    @Bean
    CustomUserDetailService userDetailsService() {
      return mock(CustomUserDetailService.class);
    }

    @Bean
    OAuth2LoginSuccessHandler successHandler() {
      return mock(OAuth2LoginSuccessHandler.class);
    }

    @Bean
    OAuth2LoginFailureHandler failureHandler() {
      return mock(OAuth2LoginFailureHandler.class);
    }

    @Bean
    JwtAuthenticationEntryPoint entryPoint() {
      return new JwtAuthenticationEntryPoint();
    }

    @Bean
    JdbcTemplate jdbc() {
      return mock(JdbcTemplate.class);
    }

    @Bean
    DataSeedService seed() {
      return mock(DataSeedService.class);
    }

    @Bean
    VnpayService vnpay() {
      return mock(VnpayService.class);
    }

    @Bean
    VnpayCallbackService vnpayCallbacks() {
      return mock(VnpayCallbackService.class);
    }

    @Bean
    JwtDecoderConfig decoder() {
      JwtDecoderConfig decoder = mock(JwtDecoderConfig.class);
      when(decoder.decode(anyString()))
          .thenAnswer(
              call ->
                  Jwt.withTokenValue(call.getArgument(0))
                      .header("alg", "HS512")
                      .subject("operator")
                      .claim("role", call.getArgument(0))
                      .issuedAt(Instant.now())
                      .expiresAt(Instant.now().plusSeconds(60))
                      .build());
      return decoder;
    }

    @Bean
    ClientRegistrationRepository clients() {
      return new InMemoryClientRegistrationRepository(
          ClientRegistration.withRegistrationId("google")
              .clientId("synthetic")
              .clientSecret("synthetic")
              .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
              .redirectUri("http://localhost/login/oauth2/code/google")
              .authorizationUri("https://example.invalid/auth")
              .tokenUri("https://example.invalid/token")
              .userInfoUri("https://example.invalid/user")
              .userNameAttributeName("sub")
              .build());
    }
  }
}
