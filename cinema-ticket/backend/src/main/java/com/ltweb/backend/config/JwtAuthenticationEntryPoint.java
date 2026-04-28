package com.ltweb.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.ltweb.backend.dto.response.ErrorResponse;
import com.ltweb.backend.exception.ErrorCode;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Date;
import java.util.TimeZone;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

  @Override
  public void commence(
      HttpServletRequest request,
      HttpServletResponse response,
      AuthenticationException authException)
      throws IOException, ServletException {
    ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

    response.setStatus(errorCode.getStatus().value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);

    ErrorResponse errorResponse =
        ErrorResponse.builder()
            .code(errorCode.getCode())
            .error(errorCode.getStatus().getReasonPhrase())
            .message(errorCode.getMessage())
            .timestamp(new Date())
            .path(resolveOriginalPath(request))
            .build();

    ObjectMapper objectMapper = new ObjectMapper();
    objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    objectMapper.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
    response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    response.flushBuffer();
  }

  private String resolveOriginalPath(HttpServletRequest request) {
    Object errorUri = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
    if (errorUri != null) {
      return errorUri.toString();
    }

    Object forwardUri = request.getAttribute(RequestDispatcher.FORWARD_REQUEST_URI);
    if (forwardUri != null) {
      return forwardUri.toString();
    }

    Object includeUri = request.getAttribute(RequestDispatcher.INCLUDE_REQUEST_URI);
    if (includeUri != null) {
      return includeUri.toString();
    }

    return request.getRequestURI();
  }
}
