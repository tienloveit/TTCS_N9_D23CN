package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RateMovieRequest {
    @NotNull(message = "Rating score is required")
    @Min(value = 1, message = "Rating score must be at least 1")
    @Max(value = 5, message = "Rating score must be at most 5")
    private Integer score;

    @Size(max = 500, message = "Comment must not exceed 500 characters")
    private String comment;
}
