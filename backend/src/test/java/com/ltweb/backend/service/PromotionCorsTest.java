package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ltweb.backend.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.filter.CorsFilter;

class PromotionCorsTest {
  @Test
  void browserPreflightAllowsAuthenticatedPatchFromFrontend() throws Exception {
    var config = new SecurityConfig(null, null, null, null, null);
    ReflectionTestUtils.setField(config, "allowedOrigins", defaultAllowedOrigins());
    var request = new MockHttpServletRequest("OPTIONS", "/api/booking/5/apply-promotion");
    request.addHeader("Origin", "http://localhost:5173");
    request.addHeader("Access-Control-Request-Method", "PATCH");
    request.addHeader("Access-Control-Request-Headers", "authorization,content-type");
    var response = new MockHttpServletResponse();
    new CorsFilter(config.corsConfigurationSource())
        .doFilter(
            request,
            response,
            (req, res) -> {
              throw new AssertionError("Preflight must terminate in the CORS filter");
            });
    assertThat(response.getStatus()).isEqualTo(200);
    assertThat(response.getHeader("Access-Control-Allow-Origin"))
        .isEqualTo("http://localhost:5173");
    assertThat(response.getHeader("Access-Control-Allow-Methods")).contains("PATCH");
    assertThat(response.getHeader("Access-Control-Allow-Headers"))
        .containsIgnoringCase("authorization")
        .containsIgnoringCase("content-type");
  }

  /** Danh sách origin mặc định trong application.yaml, khi không đặt APP_CORS_ALLOWED_ORIGINS. */
  private static String[] defaultAllowedOrigins() {
    var yaml = new YamlPropertiesFactoryBean();
    yaml.setResources(new ClassPathResource("application.yaml"));
    var environment = new StandardEnvironment();
    environment
        .getPropertySources()
        .addFirst(new PropertiesPropertySource("app", yaml.getObject()));
    return environment.getRequiredProperty("app.cors.allowed-origins", String[].class);
  }
}
