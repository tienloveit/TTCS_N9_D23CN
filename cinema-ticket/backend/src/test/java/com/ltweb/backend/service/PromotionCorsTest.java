package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ltweb.backend.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.CorsFilter;

class PromotionCorsTest {
  @Test
  void browserPreflightAllowsAuthenticatedPatchFromFrontend() throws Exception {
    var config = new SecurityConfig(null, null, null, null, null);
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
    assertThat(response.getHeader("Access-Control-Allow-Headers").toLowerCase())
        .contains("authorization", "content-type");
  }
}
