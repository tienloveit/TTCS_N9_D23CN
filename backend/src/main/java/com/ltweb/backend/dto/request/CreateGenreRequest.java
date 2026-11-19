package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateGenreRequest {
  @NotBlank(message = "Genre name is required")
  @Size(max = 100, message = "Genre name must be at most 100 characters")
  private String name;
}
