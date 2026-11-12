package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ltweb.backend.config.*;
import com.ltweb.backend.controller.CleanupController;
import com.ltweb.backend.controller.VnpayController;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.FilterChainProxy;
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
        context(profiles, true).run(ctx -> {
            assertThat(ctx).doesNotHaveBean(CleanupController.class);
            mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class))
                    .perform(request("DELETE", "/v1/cleanup/database", "ADMIN")).andExpect(status().isNotFound());
            verify(ctx.getBean(JdbcTemplate.class), never()).execute(anyString());
            verifyNoInteractions(ctx.getBean(DataSeedService.class));
        });
    }

    @Test
    void cleanupRemainsOffByDefaultInDevelopment() {
        context("dev", false).run(ctx -> {
            assertThat(ctx).doesNotHaveBean(CleanupController.class);
            verify(ctx.getBean(JdbcTemplate.class), never()).execute(anyString());
        });
    }

    @Test
    void cleanupRequiresAnAuthenticatedAdminWhenEnabled() {
        context("dev", true).run(ctx -> {
            assertThat(ctx).hasSingleBean(CleanupController.class);
            MockMvc mvc = mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
            mvc.perform(request("DELETE", "/v1/cleanup/database", null)).andExpect(status().isUnauthorized());
            for (String role : new String[]{"USER", "STAFF", "MANAGER"}) {
                mvc.perform(request("DELETE", "/v1/cleanup/database", role)).andExpect(status().isForbidden());
            }
            verify(ctx.getBean(JdbcTemplate.class), never()).execute(anyString());
            verifyNoInteractions(ctx.getBean(DataSeedService.class));
            // JDBC and seeding are mocks: this test never resets a real database.
            mvc.perform(request("DELETE", "/v1/cleanup/database", "ADMIN")).andExpect(status().isOk());
            verify(ctx.getBean(DataSeedService.class)).seedInitialData();
        });
    }

    @Test
    void gatewayManagementRoutesRejectAnonymousCustomersAndStaffBeforeCallingServices() {
        context("default", false).run(ctx -> {
            MockMvc mvc = mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
            for (String route : new String[]{"/v1/vnpay/querydr", "/v1/vnpay/refund"}) {
                mvc.perform(request("POST", route, null).content("{}"))
                        .andExpect(status().isUnauthorized());
                for (String role : new String[]{"USER", "STAFF"}) {
                    mvc.perform(request("POST", route, role).content("{}"))
                            .andExpect(status().isForbidden());
                }
            }
            verifyNoInteractions(ctx.getBean(VnpayService.class));
            String body = "{\"orderId\":\"17\",\"transDate\":\"20261112102030\","
                    + "\"trantype\":\"02\",\"amount\":125000,\"user\":\"ignored\"}";
            for (String role : new String[]{"ADMIN", "MANAGER"}) {
                mvc.perform(request("POST", "/v1/vnpay/querydr", role).content(body)).andExpect(status().isOk());
                mvc.perform(request("POST", "/v1/vnpay/refund", role).content(body)).andExpect(status().isOk());
            }
        });
    }

    @Test
    void gatewayCallbacksRemainPublic() {
        context("default", false).run(ctx -> {
            MockMvc mvc = mockMvc(ctx.getSourceApplicationContext(), ctx.getBean(FilterChainProxy.class));
            mvc.perform(request("GET", "/v1/vnpay/return", null)).andExpect(status().isOk());
            mvc.perform(request("GET", "/v1/vnpay/ipn", null)).andExpect(status().isOk());
            verify(ctx.getBean(VnpayService.class)).processReturnUrl(anyMap());
            verify(ctx.getBean(VnpayService.class)).processIpn(anyMap());
        });
    }

    private MockHttpServletRequestBuilder request(String method, String path, String role) {
        SecurityContextHolder.clearContext();
        MockHttpServletRequestBuilder request = org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .request(org.springframework.http.HttpMethod.valueOf(method), "/api" + path)
                .contextPath("/api").servletPath(path).contentType(MediaType.APPLICATION_JSON);
        if (role != null) request.header("Authorization", "Bearer " + role);
        return request;
    }

    private MockMvc mockMvc(org.springframework.web.context.WebApplicationContext ctx, FilterChainProxy filter) {
        return MockMvcBuilders.webAppContextSetup(ctx).addFilters(filter).build();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({SecurityConfig.class, CleanupController.class, VnpayController.class})
    static class TestConfig {
        @Bean CustomUserDetailService userDetailsService() { return mock(CustomUserDetailService.class); }
        @Bean OAuth2LoginSuccessHandler successHandler() { return mock(OAuth2LoginSuccessHandler.class); }
        @Bean OAuth2LoginFailureHandler failureHandler() { return mock(OAuth2LoginFailureHandler.class); }
        @Bean JwtAuthenticationEntryPoint entryPoint() { return new JwtAuthenticationEntryPoint(); }
        @Bean JdbcTemplate jdbc() { return mock(JdbcTemplate.class); }
        @Bean DataSeedService seed() { return mock(DataSeedService.class); }
        @Bean VnpayService vnpay() { return mock(VnpayService.class); }
        @Bean JwtDecoderConfig decoder() {
            JwtDecoderConfig decoder = mock(JwtDecoderConfig.class);
            when(decoder.decode(anyString())).thenAnswer(call -> Jwt.withTokenValue(call.getArgument(0))
                    .header("alg", "HS512").subject("operator").claim("role", call.getArgument(0))
                    .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build());
            return decoder;
        }
        @Bean ClientRegistrationRepository clients() {
            return new InMemoryClientRegistrationRepository(ClientRegistration.withRegistrationId("google")
                    .clientId("synthetic").clientSecret("synthetic")
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri("http://localhost/login/oauth2/code/google")
                    .authorizationUri("https://example.invalid/auth").tokenUri("https://example.invalid/token")
                    .userInfoUri("https://example.invalid/user").userNameAttributeName("sub").build());
        }
    }
}
