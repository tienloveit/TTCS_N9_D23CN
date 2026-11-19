package com.ltweb.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
  private T data;
  private int page;
  private int size;
  private long totalElements;
  private int totalPages;
}
