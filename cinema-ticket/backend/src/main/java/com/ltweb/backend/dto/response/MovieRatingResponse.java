package com.ltweb.backend.dto.response;

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
  private Integer score;
  private Double averageRating;
  private Long ratingCount;
}
