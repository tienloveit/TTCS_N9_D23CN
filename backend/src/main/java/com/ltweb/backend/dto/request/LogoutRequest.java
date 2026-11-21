package com.ltweb.backend.dto.request;

import lombok.Getter;
import lombok.Setter;

/** Tokens of the session to end. Both are optional; the Bearer header is still accepted. */
@Getter
@Setter
public class LogoutRequest {
  private String accessToken;
  private String refreshToken;
}
