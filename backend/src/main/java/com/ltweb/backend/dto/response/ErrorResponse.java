package com.ltweb.backend.dto.response;

import java.io.Serializable;
import java.util.Date;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse implements Serializable {
  private int code; // Error code (400, 404, 500...)
  private String error; // HTTP status reason (Bad Request, Not Found...)
  private String message; // Chi tiết lỗi
  private Date timestamp; // Thời điểm xảy ra lỗi
  private String path; // API endpoint bị lỗi
}
