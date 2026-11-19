package com.ltweb.backend.dto;

import java.util.Date;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class TokenPayload {
  private String token;
  private String jwtId;
  private Date expiredTime;
}
