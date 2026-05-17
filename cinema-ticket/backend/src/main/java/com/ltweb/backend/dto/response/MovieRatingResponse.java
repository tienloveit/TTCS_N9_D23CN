package com.ltweb.backend.dto.response;

import java.time.LocalDateTime;
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
public class MovieRatingResponse {
  private Long movieId;
  private Long userId;
  private String username;
  private Integer score;
  private String comment;
  private LocalDateTime createdAt;
  private Double averageRating;
  private Long ratingCount;
}
