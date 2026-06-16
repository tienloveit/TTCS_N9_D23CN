package com.ltweb.backend.config;

import com.ltweb.backend.dto.response.LoginResponse;
import com.ltweb.backend.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {
    private final ObjectProvider<AuthService> authService;

    @Value("${app.oauth2.redirect-success-url}")
    private String successUrl;

    @Value("${app.oauth2.redirect-failure-url}")
    private String failureUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        try {
            OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
            LoginResponse loginResponse = authService.getObject().loginWithGoogle(oAuth2User);
            response.sendRedirect(buildSuccessRedirect(loginResponse));
        } catch (RuntimeException exception) {
            response.sendRedirect(buildFailureRedirect(exception.getMessage()));
        }
    }

    private String buildSuccessRedirect(LoginResponse loginResponse) {
        String fragment = "accessToken="
                + encode(loginResponse.getAccessToken())
                + "&refreshToken="
                + encode(loginResponse.getRefreshToken());
        String separator = successUrl.contains("#") ? "&" : "#";
        return successUrl + separator + fragment;
    }

    private String buildFailureRedirect(String message) {
        return UriComponentsBuilder.fromUriString(failureUrl)
                .queryParam("oauth2Error", message == null ? "Google login failed" : message)
                .build()
                .encode()
                .toUriString();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
