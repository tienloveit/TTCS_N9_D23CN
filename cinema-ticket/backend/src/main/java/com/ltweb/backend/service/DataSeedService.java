package com.ltweb.backend.service;

import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Director;
import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.Genre;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.SeatTypePrice;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.AgeRating;
import com.ltweb.backend.enums.BranchStatus;
import com.ltweb.backend.enums.MovieStatus;
import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.enums.RoomType;
import com.ltweb.backend.enums.SeatType;
import com.ltweb.backend.enums.ShowtimeStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.repository.BranchRepository;
import com.ltweb.backend.repository.DirectorRepository;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.GenreRepository;
import com.ltweb.backend.repository.MovieRepository;
import com.ltweb.backend.repository.RoomRepository;
import com.ltweb.backend.repository.SeatRepository;
import com.ltweb.backend.repository.SeatTypePriceRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataSeedService {

  private final PasswordEncoder passwordEncoder;
  private final UserRepository userRepository;
  private final SeatTypePriceRepository seatTypePriceRepository;
  private final FoodRepository foodRepository;
  private final DirectorRepository directorRepository;
  private final GenreRepository genreRepository;
  private final MovieRepository movieRepository;
  private final BranchRepository branchRepository;
  private final RoomRepository roomRepository;
  private final SeatRepository seatRepository;
  private final ShowtimeRepository showtimeRepository;
  private final TicketRepository ticketRepository;
  private final JdbcTemplate jdbcTemplate;

  @Transactional
  public void seedInitialData() {
    ensureUserRoleColumnSupportsStaff();
    seedUsers();
    seedSeatTypePrices();
    seedFoods();

    Map<String, Genre> genres = seedGenres();
    List<Director> directors = seedDirectors();
    List<Movie> movies = seedMovies(genres, directors);
    List<Room> rooms = seedBranchesRoomsAndSeats();
    seedShowtimesAndTickets(movies, rooms);

    log.info("Demo seed data has been checked and refreshed.");
  }

  private void ensureUserRoleColumnSupportsStaff() {
    try {
      jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(20)");
    } catch (Exception ex) {
      log.debug("Could not adjust users.role column: {}", ex.getMessage());
    }
  }

  private void seedUsers() {
    upsertUser(
        "admin",
        "admin@123",
        UserRole.ADMIN,
        "MoviePTIT Admin",
        "admin@movieptit.vn",
        "0901000000");
    upsertUser(
        "staff",
        "staff@123",
        UserRole.STAFF,
        "Minh Anh - Quầy vé",
        "staff@movieptit.vn",
        "0901000001");
    upsertUser(
        "user",
        "user@123",
        UserRole.USER,
        "Nguyễn Hoàng Huy",
        "huy.nguyen@example.com",
        "0902000001");
    upsertUser(
        "user2",
        "user2@123",
        UserRole.USER,
        "Trần Mai Phương",
        "phuong.tran@example.com",
        "0902000002");
  }

  private void upsertUser(
      String username,
      String password,
      UserRole role,
      String fullName,
      String email,
      String phoneNumber) {
    User user =
        userRepository
            .findByUsername(username)
            .orElseGet(
                () ->
                    User.builder()
                        .username(username)
                        .password(passwordEncoder.encode(password))
                        .build());

    user.setFullName(fullName);
    user.setRole(role);
    user.setStatus(UserStatus.ACTIVE);
    setEmailIfAvailable(user, email);
    setPhoneIfAvailable(user, phoneNumber);
    boolean isNew = user.getId() == null;
    userRepository.save(user);

    if (isNew) {
      log.warn("Seed user \"{}\" has been created with default password \"{}\".", username, password);
    }
  }

  private void setEmailIfAvailable(User user, String email) {
    if (email == null || email.equals(user.getEmail()) || !userRepository.existsByEmail(email)) {
      user.setEmail(email);
    }
  }

  private void setPhoneIfAvailable(User user, String phoneNumber) {
    if (phoneNumber == null
        || phoneNumber.equals(user.getPhoneNumber())
        || !userRepository.existsByPhoneNumber(phoneNumber)) {
      user.setPhoneNumber(phoneNumber);
    }
  }

  private void seedSeatTypePrices() {
    Map<SeatType, BigDecimal> prices =
        Map.of(
            SeatType.STANDARD,
            new BigDecimal("75000"),
            SeatType.VIP,
            new BigDecimal("105000"),
            SeatType.COUPLE,
            new BigDecimal("180000"));

    prices.forEach(
        (seatType, price) -> {
          SeatTypePrice seatTypePrice =
              seatTypePriceRepository
                  .findBySeatType(seatType)
                  .orElseGet(() -> SeatTypePrice.builder().seatType(seatType).build());
          seatTypePrice.setPrice(price);
          seatTypePriceRepository.save(seatTypePrice);
        });
  }

  private void seedFoods() {
    List<FoodSeed> foodSeeds =
        List.of(
            new FoodSeed(
                "Bap rang bo nho",
                "Bắp bơ Caramel nhỏ",
                "Bắp rang bơ vị caramel, phần nhỏ cho một người.",
                "45000",
                "https://commons.wikimedia.org/wiki/Special:FilePath/Caramel%20Chocolate%20Popcorn%20in%20a%20bucket%20%2815256400336%29.jpg?width=640"),
            new FoodSeed(
                "Bap rang bo lon",
                "Bắp bơ phô mai lớn",
                "Bắp rang bơ phủ phô mai, phần lớn dùng chung rất hợp khi xem bom tấn.",
                "69000",
                "https://commons.wikimedia.org/wiki/Special:FilePath/Popcornopolis%20cheddar%20cheese%20popcorn%201.JPG?width=640"),
            new FoodSeed(
                "Nuoc ngot",
                "Nước ngọt refill",
                "Ly nước ngọt có đá, được refill một lần trong ngày xem phim.",
                "35000",
                "https://commons.wikimedia.org/wiki/Special:FilePath/Soda.jpg?width=640"),
            new FoodSeed(
                "Combo 2 nguoi",
                "Combo Couple",
                "Một bắp phô mai lớn, hai nước ngọt và một phần snack vị rong biển.",
                "139000",
                "https://cdn.pixabay.com/photo/2018/05/20/10/05/popcorn-3415594_1280.jpg"),
            new FoodSeed(
                "Hotdog",
                "Hotdog bò nướng",
                "Bánh hotdog nóng với xúc xích bò, sốt mù tạt mật ong và hành phi.",
                "59000",
                "https://commons.wikimedia.org/wiki/Special:FilePath/Hotdog%20%2838547445665%29.jpg?width=640"),
            new FoodSeed(
                "Nachos",
                "Nachos sốt phô mai",
                "Bánh nachos giòn ăn kèm sốt phô mai cay nhẹ.",
                "79000",
                "https://commons.wikimedia.org/wiki/Special:FilePath/Nachos-cheese%20%28cropped%29.jpg?width=640"));

    foodSeeds.forEach(this::upsertFood);
  }

  private void upsertFood(FoodSeed seed) {
    Food food =
        foodRepository
            .findFirstByNameIgnoreCase(seed.legacyName())
            .or(() -> foodRepository.findFirstByNameIgnoreCase(seed.name()))
            .orElseGet(Food::new);

    food.setName(seed.name());
    food.setDescription(seed.description());
    food.setPrice(new BigDecimal(seed.price()));
    food.setImageUrl(seed.imageUrl());
    food.setActive(true);
    foodRepository.save(food);
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
          directorRepository
              .findFirstByNameIgnoreCase(directorName)
              .orElseGet(Director::new);
      director.setName(directorName);
      directors.add(directorRepository.save(director));
    }

    return directors;
  }

  private List<Movie> seedMovies(Map<String, Genre> genres, List<Director> directors) {
    LocalDate today = LocalDate.now();

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
                "https://upload.wikimedia.org/wikipedia/vi/9/9c/L%E1%BA%ADt_m%E1%BA%B7t_7_M%E1%BB%99t_%C4%91i%E1%BB%81u_%C6%B0%E1%BB%9Bc_poster.jpg",
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
                "https://upload.wikimedia.org/wikipedia/vi/a/a8/Mai_2024_poster.jpg",
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
                "https://upload.wikimedia.org/wikipedia/en/8/8a/The_Avengers_%282012_movie%29_poster.jpg",
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

  private List<Room> seedBranchesRoomsAndSeats() {
    List<BranchSeed> branchSeeds =
        List.of(
            new BranchSeed(
                "CN-HCM-01",
                "MoviePTIT Nguyễn Huệ",
                "10 Nguyễn Huệ, Quận 1",
                "TP. Hồ Chí Minh",
                "0901000001"),
            new BranchSeed(
                "CN-HCM-02",
                "MoviePTIT Landmark",
                "720A Điện Biên Phủ, Bình Thạnh",
                "TP. Hồ Chí Minh",
                "0901000002"),
            new BranchSeed(
                "CN-HN-01",
                "MoviePTIT Hồ Gươm",
                "20 Hàng Bài, Hoàn Kiếm",
                "Hà Nội",
                "0901000003"),
            new BranchSeed(
                "CN-DN-01",
                "MoviePTIT Sông Hàn",
                "15 Bạch Đằng, Hải Châu",
                "Đà Nẵng",
                "0901000004"));

    Map<String, Branch> branches = new LinkedHashMap<>();
    for (BranchSeed seed : branchSeeds) {
      Branch branch =
          branchRepository.findByBranchCode(seed.branchCode()).orElseGet(Branch::new);
      branch.setBranchCode(seed.branchCode());
      branch.setName(seed.name());
      branch.setAddress(seed.address());
      branch.setCity(seed.city());
      branch.setPhone(seed.phone());
      branch.setStatus(BranchStatus.ACTIVE);
      branches.put(seed.branchCode(), branchRepository.save(branch));
    }

    List<Room> rooms = new ArrayList<>();
    branches.values().forEach(branch -> rooms.addAll(seedRooms(branch)));
    rooms.forEach(this::seedSeats);
    return rooms;
  }

  private List<Room> seedRooms(Branch branch) {
    List<RoomSeed> roomSeeds =
        List.of(
            new RoomSeed("R01", "Phòng Standard 1", RoomType.TWO_D),
            new RoomSeed("R02", "Phòng IMAX Atmos", RoomType.IMAX),
            new RoomSeed("R03", "Phòng 4DX Motion", RoomType.FOUR_DX));

    List<Room> rooms = new ArrayList<>();
    for (RoomSeed seed : roomSeeds) {
      Room room =
          roomRepository
              .findByBranchBranchIdAndCode(branch.getBranchId(), seed.code())
              .orElseGet(Room::new);
      room.setBranch(branch);
      room.setCode(seed.code());
      room.setName(seed.name());
      room.setRoomType(seed.roomType());
      room.setSeatCapacity(50);
      room.setStatus(RoomStatus.ACTIVE);
      rooms.add(roomRepository.save(room));
    }
    return rooms;
  }

  private void seedSeats(Room room) {
    for (char row = 'A'; row <= 'E'; row++) {
      for (int seatNumber = 1; seatNumber <= 10; seatNumber++) {
        String rowLabel = String.valueOf(row);
        String seatCode = rowLabel + seatNumber;
        if (seatRepository.existsByRoomIdAndSeatCode(room.getId(), seatCode)) {
          continue;
        }

        SeatType seatType =
            switch (row) {
              case 'A', 'B' -> SeatType.STANDARD;
              case 'C', 'D' -> SeatType.VIP;
              default -> SeatType.COUPLE;
            };

        seatRepository.save(
            Seat.builder()
                .room(room)
                .seatCode(seatCode)
                .rowLabel(rowLabel)
                .seatNumber(seatNumber)
                .seatType(seatType)
                .isActive(true)
                .build());
      }
    }
  }

  private void seedShowtimesAndTickets(List<Movie> movies, List<Room> rooms) {
    if (movies.isEmpty() || rooms.isEmpty()) {
      return;
    }

    List<Movie> nowShowingMovies =
        movies.stream().filter(movie -> movie.getStatus() == MovieStatus.NOW_SHOWING).toList();
    if (nowShowingMovies.isEmpty()) {
      return;
    }

    List<List<LocalTime>> timeSlotGroups =
        List.of(
            List.of(LocalTime.of(9, 30), LocalTime.of(14, 0), LocalTime.of(19, 30)),
            List.of(LocalTime.of(10, 15), LocalTime.of(15, 15), LocalTime.of(20, 45)),
            List.of(LocalTime.of(11, 0), LocalTime.of(16, 0), LocalTime.of(21, 30)));
    LocalDate firstSeedDate = LocalDate.now();
    Map<SeatType, BigDecimal> priceBySeatType =
        seatTypePriceRepository.findAll().stream()
            .collect(Collectors.toMap(SeatTypePrice::getSeatType, SeatTypePrice::getPrice));
    Map<Long, List<Seat>> activeSeatsByRoom =
        rooms.stream()
            .collect(
                Collectors.toMap(
                    Room::getId,
                    room ->
                        seatRepository.findByRoomId(room.getId()).stream()
                            .filter(seat -> Boolean.TRUE.equals(seat.getIsActive()))
                            .toList()));

    for (int dayOffset = 0; dayOffset < 4; dayOffset++) {
      LocalDate showDate = firstSeedDate.plusDays(dayOffset);
      for (int roomIndex = 0; roomIndex < rooms.size(); roomIndex++) {
        Room room = rooms.get(roomIndex);
        List<LocalTime> timeSlots = timeSlotGroups.get(roomIndex % timeSlotGroups.size());
        for (int slotIndex = 0; slotIndex < timeSlots.size(); slotIndex++) {
          Movie movie =
              nowShowingMovies.get((dayOffset + roomIndex + slotIndex) % nowShowingMovies.size());
          LocalDateTime startTime = LocalDateTime.of(showDate, timeSlots.get(slotIndex));
          int durationMinutes = movie.getDurationMinutes() == null ? 120 : movie.getDurationMinutes();
          LocalDateTime endTime = startTime.plusMinutes(durationMinutes + 25L);

          Showtime showtime = findOrCreateShowtime(room, movie, startTime, endTime);
          if (showtime != null) {
            seedTickets(
                showtime,
                activeSeatsByRoom.getOrDefault(room.getId(), List.of()),
                priceBySeatType);
          }
        }
      }
    }
  }

  private Showtime findOrCreateShowtime(
      Room room, Movie movie, LocalDateTime startTime, LocalDateTime endTime) {
    return showtimeRepository
        .findByRoomIdAndMovieIdAndStartTime(room.getId(), movie.getId(), startTime)
        .orElseGet(
            () -> {
              boolean hasOverlap =
                  showtimeRepository.existsOverlappingShowtime(room.getId(), startTime, endTime);
              if (hasOverlap) {
                return null;
              }

              return showtimeRepository.save(
                  Showtime.builder()
                      .room(room)
                      .movie(movie)
                      .startTime(startTime)
                      .endTime(endTime)
                      .status(ShowtimeStatus.OPEN)
                      .build());
            });
  }

  private void seedTickets(
      Showtime showtime, List<Seat> activeSeats, Map<SeatType, BigDecimal> priceBySeatType) {
    Set<Long> ticketedSeatIds =
        ticketRepository.findByShowtimeId(showtime.getId()).stream()
            .map(ticket -> ticket.getSeat().getId())
            .collect(Collectors.toSet());

    List<Ticket> tickets =
        activeSeats.stream()
            .filter(seat -> !ticketedSeatIds.contains(seat.getId()))
            .map(
                seat ->
                    Ticket.builder()
                        .showtime(showtime)
                        .seat(seat)
                        .price(priceBySeatType.getOrDefault(seat.getSeatType(), BigDecimal.ZERO))
                        .ticketStatus(TicketStatus.AVAILABLE)
                        .build())
            .toList();

    if (!tickets.isEmpty()) {
      ticketRepository.saveAll(tickets);
    }
  }

  private record GenreSeed(String legacyName, String name) {}

  private record FoodSeed(
      String legacyName, String name, String description, String price, String imageUrl) {}

  private record BranchSeed(
      String branchCode, String name, String address, String city, String phone) {}

  private record RoomSeed(String code, String name, RoomType roomType) {}

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
