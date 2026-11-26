package com.ltweb.backend.service;

import com.ltweb.backend.entity.Director;
import com.ltweb.backend.entity.Genre;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.enums.AgeRating;
import com.ltweb.backend.enums.MovieStatus;
import com.ltweb.backend.repository.DirectorRepository;
import com.ltweb.backend.repository.GenreRepository;
import com.ltweb.backend.repository.MovieRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Dữ liệu demo cho danh mục phim: thể loại, đạo diễn và phim. Chạy lại nhiều lần vẫn an toàn. */
@Component
@RequiredArgsConstructor
class DemoCatalogSeeder {
  private final java.time.Clock clock;
  private final DirectorRepository directorRepository;
  private final GenreRepository genreRepository;
  private final MovieRepository movieRepository;

  /** Cập nhật hoặc tạo danh mục phim demo và trả danh sách phim để xếp lịch chiếu. */
  List<Movie> seed() {
    Map<String, Genre> genres = seedGenres();
    List<Director> directors = seedDirectors();
    return seedMovies(genres, directors);
  }

  private Map<String, Genre> seedGenres() {
    List<GenreSeed> genreSeeds =
        List.of(
            new GenreSeed("Hanh dong", "Hành động"),
            new GenreSeed("Phieu luu", "Phiêu lưu"),
            new GenreSeed("Hai", "Hài"),
            new GenreSeed("Kinh di", "Kinh dị"),
            new GenreSeed("Tam ly", "Tâm lý"),
            new GenreSeed("Gia dinh", "Gia đình"),
            new GenreSeed("Khoa hoc vien tuong", "Khoa học viễn tưởng"),
            new GenreSeed("Hoat hinh", "Hoạt hình"),
            new GenreSeed("Tinh cam", "Tình cảm"),
            new GenreSeed("Bi an", "Bí ẩn"));

    Map<String, Genre> genres = new HashMap<>();
    for (GenreSeed seed : genreSeeds) {
      Genre genre =
          genreRepository
              .findFirstByNameIgnoreCase(seed.legacyName())
              .or(() -> genreRepository.findFirstByNameIgnoreCase(seed.name()))
              .orElseGet(Genre::new);
      genre.setName(seed.name());
      Genre savedGenre = genreRepository.save(genre);
      genres.put(seed.legacyName(), savedGenre);
      genres.put(seed.name(), savedGenre);
    }

    return genres;
  }

  private List<Director> seedDirectors() {
    List<String> directorNames =
        List.of(
            "Lý Hải",
            "Trấn Thành",
            "Denis Villeneuve",
            "Kelsey Mann",
            "Shawn Levy",
            "Mike Mitchell",
            "James Wan",
            "Christopher Nolan",
            "Joss Whedon");

    List<Director> directors = new ArrayList<>();
    for (String directorName : directorNames) {
      Director director =
          directorRepository.findFirstByNameIgnoreCase(directorName).orElseGet(Director::new);
      director.setName(directorName);
      directors.add(directorRepository.save(director));
    }

    return directors;
  }

  private List<Movie> seedMovies(Map<String, Genre> genres, List<Director> directors) {
    LocalDate today = LocalDate.now(clock);

    List<MovieSeed> movieSeeds =
        List.of(
            new MovieSeed(
                "Nguoi Bao Ve Thanh Pho",
                "Lật Mặt 7: Một Điều Ước",
                "Bộ phim gia đình của Lý Hải xoay quanh tình mẫu tử, những lựa chọn của các người con trưởng thành và một điều ước giản dị kéo cả nhà lại gần nhau.",
                138,
                AgeRating.P,
                "Tiếng Việt",
                null,
                today.minusDays(12),
                today.plusDays(38),
                MovieStatus.NOW_SHOWING,
                "https://image.sggp.org.vn/w680/Uploaded/2026/chuabhu/2024_03_13/lat-mat-7-6-8426.jpg.webp",
                "dQw4w9WgXcQ",
                Set.of("Gia đình", "Tâm lý")),
            new MovieSeed(
                "Cuoc Phieu Luu Ngoai Vu Tru",
                "Mai",
                "Câu chuyện đời và tình yêu của Mai, một người phụ nữ từng trải, khi cô gặp lại hy vọng trong một mối quan hệ mới nhưng vẫn phải đối diện những tổn thương cũ.",
                131,
                AgeRating.T16,
                "Tiếng Việt",
                null,
                today.minusDays(8),
                today.plusDays(45),
                MovieStatus.NOW_SHOWING,
                "https://upload.wikimedia.org/wikipedia/vi/3/36/Mai_2024_poster.jpg",
                "dQw4w9WgXcQ",
                Set.of("Tình cảm", "Tâm lý")),
            new MovieSeed(
                "Gia Dinh Sieu Quay",
                "Dune: Part Two",
                "Paul Atreides hợp lực cùng người Fremen trên hành tinh Arrakis, bước vào cuộc chiến khốc liệt để trả thù và giành quyền kiểm soát tương lai của đế chế.",
                166,
                AgeRating.T13,
                "Tiếng Anh",
                "Phụ đề tiếng Việt",
                today.minusDays(4),
                today.plusDays(34),
                MovieStatus.NOW_SHOWING,
                "https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg",
                "dQw4w9WgXcQ",
                Set.of("Khoa học viễn tưởng", "Phiêu lưu")),
            new MovieSeed(
                "Bi Mat Can Phong So 7",
                "Inside Out 2",
                "Riley bước vào tuổi thiếu niên và tâm trí cô xuất hiện thêm những cảm xúc mới, khiến nhóm cảm xúc quen thuộc phải học cách cùng tồn tại.",
                96,
                AgeRating.P,
                "Tiếng Anh",
                "Lồng tiếng Việt",
                today.minusDays(3),
                today.plusDays(28),
                MovieStatus.NOW_SHOWING,
                "https://upload.wikimedia.org/wikipedia/en/f/f7/Inside_Out_2_poster.jpg",
                "dQw4w9WgXcQ",
                Set.of("Hoạt hình", "Gia đình")),
            new MovieSeed(
                "Mua Roi Tren Pho Cu",
                "Deadpool & Wolverine",
                "Deadpool buộc phải hợp tác với Wolverine trong một nhiệm vụ xuyên đa vũ trụ, vừa hỗn loạn vừa đầy những pha hành động châm biếm kiểu Marvel.",
                128,
                AgeRating.T18,
                "Tiếng Anh",
                "Phụ đề tiếng Việt",
                today.minusDays(1),
                today.plusDays(42),
                MovieStatus.NOW_SHOWING,
                "https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg",
                "dQw4w9WgXcQ",
                Set.of("Hài", "Hành động")),
            new MovieSeed(
                "Doi Dac Vu Bat Dac Di",
                "Kung Fu Panda 4",
                "Po chuẩn bị tìm người kế nhiệm danh hiệu Thần Long Đại Hiệp, nhưng một phản diện biến hình mới buộc cậu trở lại hành trình võ thuật quen thuộc.",
                94,
                AgeRating.P,
                "Tiếng Anh",
                "Lồng tiếng Việt",
                today.minusDays(5),
                today.plusDays(30),
                MovieStatus.NOW_SHOWING,
                "https://upload.wikimedia.org/wikipedia/en/7/7f/Kung_Fu_Panda_4_poster.jpg",
                "dQw4w9WgXcQ",
                Set.of("Hoạt hình", "Gia đình")),
            new MovieSeed(
                "Vu Dieu Mua He",
                "The Conjuring",
                "Hai nhà điều tra hiện tượng siêu nhiên Ed và Lorraine Warren giúp một gia đình đối mặt với thế lực ma quái trong căn nhà biệt lập.",
                112,
                AgeRating.T18,
                "Tiếng Anh",
                "Phụ đề tiếng Việt",
                today.plusDays(12),
                today.plusDays(74),
                MovieStatus.UPCOMING,
                "https://upload.wikimedia.org/wikipedia/en/8/8c/The_Conjuring_poster.jpg",
                "dQw4w9WgXcQ",
                Set.of("Kinh dị", "Bí ẩn")),
            new MovieSeed(
                "Thanh Pho Sau Nua Dem",
                "Oppenheimer",
                "Chân dung J. Robert Oppenheimer và quá trình dẫn dắt Dự án Manhattan, nơi tạo ra vũ khí hạt nhân đầu tiên trong Thế chiến II.",
                180,
                AgeRating.T16,
                "Tiếng Anh",
                "Phụ đề tiếng Việt",
                today.plusDays(20),
                today.plusDays(80),
                MovieStatus.UPCOMING,
                "https://upload.wikimedia.org/wikipedia/en/4/4a/Oppenheimer_%28film%29.jpg",
                "dQw4w9WgXcQ",
                Set.of("Tâm lý", "Bí ẩn")),
            new MovieSeed(
                "Duong Dua Mat Troi",
                "The Avengers",
                "Những siêu anh hùng mạnh nhất Trái Đất phải học cách hợp tác để ngăn Loki và đội quân ngoài hành tinh tấn công New York.",
                143,
                AgeRating.T13,
                "Tiếng Anh",
                "Phụ đề tiếng Việt",
                today.plusDays(26),
                today.plusDays(88),
                MovieStatus.UPCOMING,
                "https://upload.wikimedia.org/wikipedia/vi/f/f9/TheAvengers2012Poster.jpg",
                "dQw4w9WgXcQ",
                Set.of("Hành động", "Khoa học viễn tưởng")));

    List<Movie> movies = new ArrayList<>();
    for (int movieIndex = 0; movieIndex < movieSeeds.size(); movieIndex++) {
      MovieSeed seed = movieSeeds.get(movieIndex);
      Movie movie =
          movieRepository
              .findFirstByMovieNameIgnoreCase(seed.legacyName())
              .or(() -> movieRepository.findFirstByMovieNameIgnoreCase(seed.movieName()))
              .orElseGet(Movie::new);

      movie.setMovieName(seed.movieName());
      movie.setDescription(seed.description());
      movie.setDurationMinutes(seed.durationMinutes());
      movie.setAgeRating(seed.ageRating());
      movie.setLanguage(seed.language());
      movie.setSubtitle(seed.subtitle());
      movie.setReleaseDate(seed.releaseDate());
      movie.setEndDate(seed.endDate());
      movie.setStatus(seed.status());
      movie.setThumbnailUrl(seed.thumbnailUrl());
      movie.setTrailerUrl(seed.trailerUrl());
      if (!directors.isEmpty()) {
        movie.setDirector(directors.get(movieIndex % directors.size()));
      }
      movie.setGenres(
          seed.genreNames().stream()
              .map(genres::get)
              .filter(Objects::nonNull)
              .collect(Collectors.toSet()));

      movies.add(movieRepository.save(movie));
    }

    return movies;
  }

  private record GenreSeed(String legacyName, String name) {}

  private record MovieSeed(
      String legacyName,
      String movieName,
      String description,
      Integer durationMinutes,
      AgeRating ageRating,
      String language,
      String subtitle,
      LocalDate releaseDate,
      LocalDate endDate,
      MovieStatus status,
      String thumbnailUrl,
      String trailerUrl,
      Set<String> genreNames) {}
}
