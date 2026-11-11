package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.AgeRating;
import com.ltweb.backend.enums.MovieStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.Set;
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
public class CreateMovieRequest {
    @NotBlank(message = "Movie name is required")
    @Size(max = 255, message = "Movie name must be at most 255 characters")
    private String movieName;

    @Size(max = 255)
    private String originalTitle;

    @Size(max = 2000)
    private String castNames;

    @Size(max = 500)
    private String bannerUrl;

    @Size(max = 255)
    private String directorName;

    private Boolean isPublic;

    @Size(max = 5000, message = "Description must be at most 5000 characters")
    private String description;

    @NotBlank(message = "Vui lòng tải poster phim")
    @Size(max = 500, message = "Thumbnail URL must be at most 500 characters")
    private String thumbnailUrl;

    @NotNull(message = "Vui lòng nhập thời lượng phim")
    @Positive(message = "Thời lượng phải lớn hơn 0")
    private Integer durationMinutes;

    private AgeRating ageRating;

    @Size(max = 100, message = "Language must be at most 100 characters")
    private String language;

    @Size(max = 100, message = "Subtitle must be at most 100 characters")
    private String subtitle;

    @Size(max = 500, message = "Trailer URL must be at most 500 characters")
    private String trailerUrl;

    private LocalDate releaseDate;

    private LocalDate endDate;

    private MovieStatus status;

    private Long directorId;

    @NotEmpty(message = "Vui lòng chọn thể loại")
    private Set<Long> genreIds;
}
