package com.ltweb.backend.dto.request;

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
public class UpdateDirectorRequest {
  @Size(max = 255, message = "Director name must be at most 255 characters")
  private String name;

  @Size(max = 1000, message = "Director bio must be at most 1000 characters")
  private String bio;
}
