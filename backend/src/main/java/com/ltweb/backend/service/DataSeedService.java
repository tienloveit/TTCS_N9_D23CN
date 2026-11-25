package com.ltweb.backend.service;

import com.ltweb.backend.entity.Food;
import com.ltweb.backend.entity.Movie;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.MovieStatus;
import com.ltweb.backend.enums.ShowtimeStatus;
import com.ltweb.backend.enums.TicketStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.repository.FoodRepository;
import com.ltweb.backend.repository.SeatRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.TicketRepository;
import com.ltweb.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataSeedService {

  private final java.time.Clock clock;
  private final PasswordEncoder passwordEncoder;
  private final UserRepository userRepository;
  private final FoodRepository foodRepository;
  private final SeatRepository seatRepository;
  private final ShowtimeRepository showtimeRepository;
  private final TicketRepository ticketRepository;
  private final DemoCatalogSeeder catalogSeeder;
  private final DemoVenueSeeder venueSeeder;

  @Transactional
  public void seedInitialData() {
    seedUsers();
    seedFoods();

    List<Movie> movies = catalogSeeder.seed();
    List<Room> rooms = venueSeeder.seed();
    seedShowtimesAndTickets(movies, rooms);

    log.info("Demo seed data has been checked and refreshed.");
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
        "manager",
        "manager@123",
        UserRole.MANAGER,
        "MoviePTIT Manager",
        "manager@movieptit.vn",
        "0901000002");
    upsertUser(
        "user",
        "user@123",
        UserRole.USER,
        "Nguyễn Thanh Tu 2",
        "tunguyen20905@gmail.com",
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
      log.warn(
          "Seed user \"{}\" has been created with default password \"{}\".", username, password);
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
    LocalDate firstSeedDate = LocalDate.now(clock);
    Map<Long, List<Seat>> activeSeatsByRoom =
        rooms.stream()
            .collect(
                Collectors.toMap(
                    Room::getId,
                    room -> seatRepository.findByRoomId(room.getId()).stream().toList()));

    for (int dayOffset = 0; dayOffset < 4; dayOffset++) {
      LocalDate showDate = firstSeedDate.plusDays(dayOffset);
      for (int roomIndex = 0; roomIndex < rooms.size(); roomIndex++) {
        Room room = rooms.get(roomIndex);
        List<LocalTime> timeSlots = timeSlotGroups.get(roomIndex % timeSlotGroups.size());
        for (int slotIndex = 0; slotIndex < timeSlots.size(); slotIndex++) {
          Movie movie =
              nowShowingMovies.get((dayOffset + roomIndex + slotIndex) % nowShowingMovies.size());
          LocalDateTime startTime = LocalDateTime.of(showDate, timeSlots.get(slotIndex));
          int durationMinutes =
              movie.getDurationMinutes() == null ? 120 : movie.getDurationMinutes();
          LocalDateTime endTime = startTime.plusMinutes(durationMinutes + 25L);

          Showtime showtime = findOrCreateShowtime(room, movie, startTime, endTime);
          if (showtime != null) {
            seedTickets(showtime, activeSeatsByRoom.getOrDefault(room.getId(), List.of()));
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

  private void seedTickets(Showtime showtime, List<Seat> activeSeats) {
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
                        .price(showtime.getTicketPrice())
                        .ticketStatus(TicketStatus.AVAILABLE)
                        .build())
            .toList();

    if (!tickets.isEmpty()) {
      ticketRepository.saveAll(tickets);
    }
  }

  private record FoodSeed(
      String legacyName, String name, String description, String price, String imageUrl) {}
}
