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
                "https://placehold.co/640x480/F59E0B/111827?text=Caramel+Popcorn"),
            new FoodSeed(
                "Bap rang bo lon",
                "Bắp bơ phô mai lớn",
                "Bắp rang bơ phủ phô mai, phần lớn dùng chung rất hợp khi xem bom tấn.",
                "69000",
                "https://placehold.co/640x480/FBBF24/111827?text=Cheese+Popcorn"),
            new FoodSeed(
                "Nuoc ngot",
                "Nước ngọt refill",
                "Ly nước ngọt có đá, được refill một lần trong ngày xem phim.",
                "35000",
                "https://placehold.co/640x480/38BDF8/0F172A?text=Soft+Drink"),
            new FoodSeed(
                "Combo 2 nguoi",
                "Combo Couple",
                "Một bắp phô mai lớn, hai nước ngọt và một phần snack vị rong biển.",
                "139000",
                "https://placehold.co/640x480/EC4899/FFFFFF?text=Couple+Combo"),
            new FoodSeed(
                "Hotdog",
                "Hotdog bò nướng",
                "Bánh hotdog nóng với xúc xích bò, sốt mù tạt mật ong và hành phi.",
                "59000",
                "https://placehold.co/640x480/EF4444/FFFFFF?text=Hotdog"),
            new FoodSeed(
                "Nachos",
                "Nachos sốt phô mai",
                "Bánh nachos giòn ăn kèm sốt phô mai cay nhẹ.",
                "79000",
                "https://placehold.co/640x480/F97316/111827?text=Nachos"));

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
            "Minh Tran",
            "An Nguyen",
            "Linh Pham",
            "Bao Le",
            "Mai Do",
            "Quang Vo");

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
                "Người Bảo Vệ Thành Phố",
                "Một cựu lính cứu hộ làm ca đêm tại trung tâm thương mại vô tình phát hiện đường dây buôn lậu đang nhắm vào thành phố. Nhịp phim nhanh, nhiều cảnh rượt đuổi và một câu chuyện chuộc lỗi ấm áp.",
                118,
                AgeRating.T16,
                "Tiếng Việt",
                "Phụ đề tiếng Anh",
                today.minusDays(12),
                today.plusDays(38),
                MovieStatus.NOW_SHOWING,
                "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&h=900&q=85",
                "dQw4w9WgXcQ",
                Set.of("Hành động", "Tâm lý")),
            new MovieSeed(
                "Cuoc Phieu Luu Ngoai Vu Tru",
                "Trạm Sao Cuối Cùng",
                "Chuyến tàu nghiên cứu đầu tiên vượt qua vành đai tiểu hành tinh mất liên lạc với Trái Đất. Một phi hành đoàn trẻ phải chọn giữa trở về an toàn hoặc hoàn tất tín hiệu cứu hộ cuối cùng.",
                132,
                AgeRating.T13,
                "Tiếng Anh",
                "Phụ đề tiếng Việt",
                today.minusDays(8),
                today.plusDays(45),
                MovieStatus.NOW_SHOWING,
                "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=600&h=900&q=85",
                "dQw4w9WgXcQ",
                Set.of("Khoa học viễn tưởng", "Phiêu lưu")),
            new MovieSeed(
                "Gia Dinh Sieu Quay",
                "Gia Đình Siêu Quậy",
                "Một gia đình ba thế hệ lên đường về quê ăn giỗ, nhưng mọi kế hoạch đều lệch nhịp vì chú chó lạc, chiếc xe cũ và một bí mật gia đình chưa ai dám nói ra.",
                104,
                AgeRating.P,
                "Tiếng Việt",
                null,
                today.minusDays(4),
                today.plusDays(34),
                MovieStatus.NOW_SHOWING,
                "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&h=900&q=85",
                "dQw4w9WgXcQ",
                Set.of("Hài", "Gia đình")),
            new MovieSeed(
                "Bi Mat Can Phong So 7",
                "Bí Mật Căn Phòng Số 7",
                "Một nhóm bạn quay lại khách sạn bỏ hoang từng xảy ra vụ mất tích bí ẩn. Càng giải mã nhật ký cũ, họ càng nhận ra có người trong nhóm đang che giấu sự thật.",
                96,
                AgeRating.T18,
                "Tiếng Việt",
                "Phụ đề tiếng Anh",
                today.minusDays(3),
                today.plusDays(28),
                MovieStatus.NOW_SHOWING,
                "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=600&h=900&q=85",
                "dQw4w9WgXcQ",
                Set.of("Kinh dị", "Bí ẩn")),
            new MovieSeed(
                "Mua Roi Tren Pho Cu",
                "Mưa Rơi Trên Phố Cũ",
                "Một đầu bếp trẻ trở về Đà Lạt để bán căn nhà cũ của mẹ, rồi gặp lại người bạn thuở nhỏ đang cố giữ quán cà phê cuối cùng trên con dốc quen thuộc.",
                111,
                AgeRating.T13,
                "Tiếng Việt",
                null,
                today.minusDays(1),
                today.plusDays(42),
                MovieStatus.NOW_SHOWING,
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&h=900&q=85",
                "dQw4w9WgXcQ",
                Set.of("Tình cảm", "Tâm lý")),
            new MovieSeed(
                "Doi Dac Vu Bat Dac Di",
                "Đội Đặc Vụ Bất Đắc Dĩ",
                "Bốn nhân viên văn phòng bị nhầm là đặc vụ quốc tế sau một buổi team building. Họ phải dùng kỹ năng Excel, thuyết trình và may mắn để sống sót qua một phi vụ thật.",
                109,
                AgeRating.T13,
                "Tiếng Việt",
                "Phụ đề tiếng Anh",
                today.minusDays(5),
                today.plusDays(30),
                MovieStatus.NOW_SHOWING,
                "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&h=900&q=85",
                "dQw4w9WgXcQ",
                Set.of("Hài", "Hành động")),
            new MovieSeed(
                "Vu Dieu Mua He",
                "Vũ Điệu Mùa Hè",
                "Bộ phim hoạt hình âm nhạc kể về một chú bé mê nhảy và cô bạn chơi violin cùng nhau lập đội biểu diễn để cứu sân khấu mùa hè của khu phố.",
                101,
                AgeRating.K,
                "Tiếng Anh",
                "Lồng tiếng Việt",
                today.plusDays(12),
                today.plusDays(74),
                MovieStatus.UPCOMING,
                "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&h=900&q=85",
                "dQw4w9WgXcQ",
                Set.of("Hoạt hình", "Gia đình")),
            new MovieSeed(
                "Thanh Pho Sau Nua Dem",
                "Thành Phố Sau Nửa Đêm",
                "Một nữ phóng viên điều tra chuỗi mất điện kỳ lạ tại Sài Gòn và phát hiện các vụ án đều trùng với một chương trình radio phát lúc 0 giờ.",
                123,
                AgeRating.T16,
                "Tiếng Việt",
                "Phụ đề tiếng Anh",
                today.plusDays(20),
                today.plusDays(80),
                MovieStatus.UPCOMING,
                "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&h=900&q=85",
                "dQw4w9WgXcQ",
                Set.of("Bí ẩn", "Tâm lý")),
            new MovieSeed(
                "Duong Dua Mat Troi",
                "Đường Đua Mặt Trời",
                "Một tay đua trẻ rời đội chuyên nghiệp để trở về giúp xưởng xe của cha. Cuộc đua xuyên miền Trung trở thành cơ hội cuối cùng để gia đình hàn gắn.",
                116,
                AgeRating.T13,
                "Tiếng Việt",
                null,
                today.plusDays(26),
                today.plusDays(88),
                MovieStatus.UPCOMING,
                "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=600&h=900&q=85",
                "dQw4w9WgXcQ",
                Set.of("Hành động", "Gia đình")));

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
