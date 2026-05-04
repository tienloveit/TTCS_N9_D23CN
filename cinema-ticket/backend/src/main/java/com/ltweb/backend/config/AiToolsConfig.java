package com.ltweb.backend.config;

import com.ltweb.backend.dto.response.BranchResponse;
import com.ltweb.backend.dto.response.FoodResponse;
import com.ltweb.backend.dto.response.MovieResponse;
import com.ltweb.backend.dto.response.ShowtimeResponse;
import com.ltweb.backend.dto.response.TicketResponse;
import com.ltweb.backend.service.BranchService;
import com.ltweb.backend.service.FoodService;
import com.ltweb.backend.service.MovieService;
import com.ltweb.backend.service.SeatTypePriceService;
import com.ltweb.backend.service.ShowtimeService;
import com.ltweb.backend.service.TicketService;
import com.ltweb.backend.dto.response.SeatTypePriceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class AiToolsConfig {

    private final MovieService movieService;
    private final ShowtimeService showtimeService;
    private final TicketService ticketService;
    private final BranchService branchService;
    private final FoodService foodService;
    private final SeatTypePriceService seatTypePriceService;

    public record MovieSearchRequest(String title) {
    }

    public record MovieSearchResponse(String result) {
    }

    public record ShowtimeRequest(String date, String branchName) {
    }

    public record BranchShowtimeRequest(String branchName) {
    }

    public record ShowtimeResponseData(String result) {
    }

    public record GenreRequest(String genreName) {
    }

    public record GenreResponse(String result) {
    }

    public record SeatRequest(String movieName, String branchName, String date, String time) {
    }

    public record SeatResponse(String result) {
    }

    public record BookTicketRequest(String movieName, String branchName, String date, String time, String seatCodes) {
    }

    public record BookTicketResponse(String result) {
    }

    public record StatusRequest(String status) {
    }

    public record BranchInfoResponse(String result) {
    }

    public record SnackMenuResponse(String result) {
    }

    public record NowShowingResponse(String result) {
    }

    public record UpcomingResponse(String result) {
    }

    public record TicketPriceResponse(String result) {
    }

    @Bean
    @Description("Tìm kiếm thông tin phim đang chiếu hoặc sắp chiếu dựa trên tên phim hoặc từ khóa.")
    public Function<MovieSearchRequest, MovieSearchResponse> get_movie_info() {
        return request -> {
            log.info("AI Function getMovieInfo called with params: title={}", request.title());
            if (request.title() == null || request.title().isBlank()) {
                return new MovieSearchResponse("Yêu cầu người dùng cung cấp tên phim cụ thể để tìm kiếm.");
            }

            List<MovieResponse> movies = movieService.getAllMovies(request.title());
            if (movies == null || movies.isEmpty()) {
                return new MovieSearchResponse(
                        "Rất tiếc, hệ thống không tìm thấy bộ phim nào có tên chứa từ khoá: " + request.title());
            }

            StringBuilder sb = new StringBuilder("Thông tin các phim tìm được:\n");
            for (MovieResponse m : movies) {
                sb.append("- ").append(m.getMovieName()).append(" (").append(m.getDurationMinutes())
                        .append(" phút).\n");
                sb.append("  Thể loại: ")
                        .append(m.getGenres().stream().map(g -> g.getName()).collect(Collectors.joining(", ")))
                        .append(".\n");
                sb.append("  Tóm tắt: ").append(m.getDescription()).append(".\n");
                sb.append("  Đánh giá trung bình: ").append(m.getAverageRating()).append("/10 (từ ")
                        .append(m.getRatingCount()).append(" lượt đánh giá).\n");
            }
            return new MovieSearchResponse(sb.toString());
        };
    }

    @Bean
    @Description("Lấy lịch chiếu phim của một rạp chiếu (branch) vào một ngày cụ thể (định dạng YYYY-MM-DD).")
    public Function<ShowtimeRequest, ShowtimeResponseData> get_showtimes() {
        return request -> {
            log.info("AI Function getShowtimes called with params: date={}, branchName={}", request.date(),
                    request.branchName());
            if (request.date() == null || request.branchName() == null) {
                return new ShowtimeResponseData(
                        "Dữ liệu thiếu. Hãy yêu cầu người dùng cung cấp đủ tên rạp và ngày xem để tra cứu.");
            }

            // Lấy toàn bộ lịch chiếu và dùng filter để chắt lọc (tránh phải query bằng
            // branchId)
            List<ShowtimeResponse> allShowtimes = showtimeService.getAll();
            List<ShowtimeResponse> filtered = allShowtimes.stream()
                    .filter(s -> s.getBranchName() != null
                            && s.getBranchName().toLowerCase().contains(request.branchName().toLowerCase()))
                    .filter(s -> s.getStartTime() != null
                            && s.getStartTime().toLocalDate().toString().equals(request.date()))
                    .toList();

            if (filtered.isEmpty()) {
                return new ShowtimeResponseData("Không có suất chiếu nào ở rạp " + request.branchName() + " vào ngày "
                        + request.date() + ". Hãy gợi ý người dùng đổi ngày hoặc đổi rạp.");
            }

            StringBuilder sb = new StringBuilder("Lịch chiếu ở rạp " + request.branchName() + " ngày " + request.date()
                    + " (Đã có dữ liệu thật từ Database):\n");
            for (ShowtimeResponse s : filtered) {
                String time = s.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm"));
                sb.append("- Phim: ").append(s.getMovieName())
                        .append(" | Giờ chiếu: ").append(time)
                        .append(" | Phòng chiếu: ").append(s.getRoomName()).append("\n");
            }
            return new ShowtimeResponseData(sb.toString());
        };
    }

    @Bean
    @Description("Tìm kiếm các bộ phim theo thể loại (ví dụ: Hành động, Hài hước, Tình cảm, Kinh dị).")
    public Function<GenreRequest, GenreResponse> searchMoviesByGenre() {
        return request -> {
            log.info("AI Function searchMoviesByGenre called with params: genreName={}", request.genreName());
            if (request.genreName() == null || request.genreName().isBlank()) {
                return new GenreResponse("Thiếu thông tin thể loại. Hãy hỏi người dùng thích xem thể loại gì.");
            }

            List<MovieResponse> allMovies = movieService.getAllMovies(null);
            List<MovieResponse> filtered = allMovies.stream()
                    .filter(m -> m.getGenres().stream()
                            .anyMatch(g -> g.getName() != null
                                    && g.getName().toLowerCase().contains(request.genreName().toLowerCase())))
                    .toList();

            if (filtered.isEmpty()) {
                return new GenreResponse(
                        "Không tìm thấy phim nào thuộc thể loại " + request.genreName() + " đang chiếu.");
            }

            StringBuilder sb = new StringBuilder("Các phim thể loại " + request.genreName() + " đang chiếu:\n");
            for (MovieResponse m : filtered) {
                sb.append("- ").append(m.getMovieName()).append("\n");
            }
            return new GenreResponse(sb.toString());
        };
    }

    @Bean
    @Description("Kiểm tra danh sách ghế trống cho một suất chiếu cụ thể. BẮT BUỘC phải hỏi người dùng đủ 4 thông tin: Tên phim, Tên rạp, Ngày chiếu, Giờ chiếu trước khi gọi hàm này.")
    public Function<SeatRequest, SeatResponse> getAvailableSeats() {
        return request -> {
            log.info("AI Function getAvailableSeats called with params: movie={}, branch={}, date={}, time={}",
                    request.movieName(), request.branchName(), request.date(), request.time());

            if (request.movieName() == null || request.branchName() == null || request.date() == null
                    || request.time() == null) {
                return new SeatResponse(
                        "Chưa đủ thông tin (Tên phim, Tên rạp, Ngày chiếu, Giờ chiếu). Hãy hỏi lại người dùng để lấy đủ 4 thông tin này.");
            }

            // Tìm Showtime ID tương ứng
            List<ShowtimeResponse> allShowtimes = showtimeService.getAll();
            ShowtimeResponse targetShowtime = allShowtimes.stream()
                    .filter(s -> s.getBranchName() != null
                            && s.getBranchName().toLowerCase().contains(request.branchName().toLowerCase()))
                    .filter(s -> s.getMovieName() != null
                            && s.getMovieName().toLowerCase().contains(request.movieName().toLowerCase()))
                    .filter(s -> s.getStartTime() != null
                            && s.getStartTime().toLocalDate().toString().equals(request.date()))
                    .filter(s -> s.getStartTime() != null
                            && s.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")).equals(request.time()))
                    .findFirst()
                    .orElse(null);

            if (targetShowtime == null) {
                return new SeatResponse("Hệ thống kiểm tra không thấy suất chiếu nào của phim " + request.movieName()
                        + " lúc " + request.time() + " ngày " + request.date() + " tại rạp " + request.branchName()
                        + ".");
            }

            // Gọi TicketService để check ghế thật (bao gồm cả check lock Redis)
            List<TicketResponse> tickets = ticketService.getTicketsByShowtimeId(targetShowtime.getShowtimeId());
            List<String> availableSeats = tickets.stream()
                    .filter(t -> t.getDisplayStatus() == com.ltweb.backend.enums.TicketStatus.AVAILABLE)
                    .map(TicketResponse::getSeatCode)
                    .toList();

            if (availableSeats.isEmpty()) {
                return new SeatResponse("Suất chiếu này đã hết ghế trống.");
            }

            String seatListStr = String.join(", ", availableSeats);
            if (seatListStr.length() > 500) {
                seatListStr = seatListStr.substring(0, 500) + "... (còn rất nhiều ghế trống khác)";
            }

            return new SeatResponse("Số lượng ghế trống hiện tại là " + availableSeats.size()
                    + ". Các ghế trống tiêu biểu: " + seatListStr
                    + ". (Lưu ý cho AI: Hãy báo khách hàng số lượng ghế trống và gợi ý khách bấm đặt vé để được hiển thị sơ đồ chọn ghế chi tiết)");
        };
    }

    @Bean
    @Description("Thực hiện ĐẶT VÉ (Booking). BẮT BUỘC phải có đủ 4 thông tin: Tên phim, Tên rạp, Ngày chiếu, Giờ chiếu.")
    public Function<BookTicketRequest, BookTicketResponse> book_ticket() {
        return request -> {
            log.info("AI Function bookTicket called with params: movie={}, branch={}, date={}, time={}",
                    request.movieName(), request.branchName(), request.date(), request.time());

            if (request.movieName() == null || request.branchName() == null || request.date() == null
                    || request.time() == null) {
                return new BookTicketResponse(
                        "Chưa đủ thông tin để tìm suất chiếu. Vui lòng kiểm tra và hỏi người dùng cung cấp đủ: Tên phim, Rạp, Ngày, Giờ.");
            }

            // Tìm Showtime ID tương ứng
            List<ShowtimeResponse> allShowtimes = showtimeService.getAll();
            ShowtimeResponse targetShowtime = allShowtimes.stream()
                    .filter(s -> s.getBranchName() != null
                            && s.getBranchName().toLowerCase().contains(request.branchName().toLowerCase()))
                    .filter(s -> s.getMovieName() != null
                            && s.getMovieName().toLowerCase().contains(request.movieName().toLowerCase()))
                    .filter(s -> s.getStartTime() != null
                            && s.getStartTime().toLocalDate().toString().equals(request.date()))
                    .filter(s -> s.getStartTime() != null
                            && s.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")).equals(request.time()))
                    .findFirst()
                    .orElse(null);

            if (targetShowtime == null) {
                return new BookTicketResponse("Hệ thống kiểm tra không thấy suất chiếu nào của phim "
                        + request.movieName() + " lúc " + request.time() + " ngày " + request.date() + " tại rạp "
                        + request.branchName() + ". Hãy báo khách chọn suất khác.");
            }

            String frontendBookingLink = "http://localhost:5173/booking/" + targetShowtime.getShowtimeId();

            return new BookTicketResponse(
                    "Đã tìm thấy suất chiếu hợp lệ. Để AI thông báo cho người dùng: 'Hệ thống đã chuẩn bị sẵn sàng cho suất chiếu của bạn. Do quy định bảo mật thanh toán, vui lòng bấm vào đường link sau để tiến hành chọn ghế và thanh toán VNPay nhé: "
                            + frontendBookingLink + "'.");
        };
    }

    @Bean
    @Description("Lấy danh sách tất cả các rạp chiếu phim CinemaPTIT, bao gồm địa chỉ, thành phố, số điện thoại. Gọi hàm này khi người dùng hỏi rạp ở đâu, địa chỉ rạp, liên hệ rạp.")
    public Function<StatusRequest, BranchInfoResponse> getBranchInfo() {
        return request -> {
            log.info("AI Function getBranchInfo called");
            List<BranchResponse> branches = branchService.getAllBranches();
            if (branches.isEmpty()) {
                return new BranchInfoResponse("Hiện chưa có thông tin rạp nào trong hệ thống.");
            }
            StringBuilder sb = new StringBuilder("Danh sách các rạp CinemaPTIT:\n");
            for (BranchResponse b : branches) {
                sb.append("- ").append(b.getName()).append("\n");
                sb.append("  Địa chỉ: ").append(b.getAddress()).append(", ").append(b.getCity()).append("\n");
                sb.append("  Hotline: ").append(b.getPhone()).append("\n");
                sb.append("  Trạng thái: ").append(b.getStatus()).append("\n");
            }
            return new BranchInfoResponse(sb.toString());
        };
    }

    @Bean
    @Description("Lấy menu đồ ăn thức uống (bắp rang, nước, combo...) và giá bán tại rạp. Gọi khi người dùng hỏi về đồ ăn, bắp nước, combo, giá snack.")
    public Function<StatusRequest, SnackMenuResponse> getSnackMenu() {
        return request -> {
            log.info("AI Function getSnackMenu called");
            List<FoodResponse> foods = foodService.getAvailableFoods();
            if (foods.isEmpty()) {
                return new SnackMenuResponse("Hiện chưa có món ăn nào trong thực đơn.");
            }
            StringBuilder sb = new StringBuilder("Thực đơn đồ ăn thức uống tại CinemaPTIT:\n");
            for (FoodResponse f : foods) {
                sb.append("- ").append(f.getName())
                        .append(" - Giá: ").append(f.getPrice()).append(" VNĐ");
                if (f.getDescription() != null && !f.getDescription().isBlank()) {
                    sb.append(" (").append(f.getDescription()).append(")");
                }
                sb.append("\n");
            }
            return new SnackMenuResponse(sb.toString());
        };
    }

    @Bean
    @Description("Lấy danh sách các phim đang chiếu hiện tại tại tất cả các rạp CinemaPTIT.")
    public Function<StatusRequest, NowShowingResponse> get_now_showing_movies() {
        return request -> {
            log.info("AI Function getNowShowingMovies called");
            List<MovieResponse> movies = movieService.getNowShowingMovies();
            if (movies.isEmpty()) {
                return new NowShowingResponse("Hiện tại chưa có phim nào đang chiếu.");
            }
            StringBuilder sb = new StringBuilder("Các phim đang chiếu tại CinemaPTIT:\n");
            for (MovieResponse m : movies) {
                sb.append("- ").append(m.getMovieName())
                        .append(" (").append(m.getDurationMinutes()).append(" phút")
                        .append(" | ").append(m.getAgeRating()).append(")")
                        .append(" - ⭐ ").append(m.getAverageRating()).append("/10\n");
            }
            return new NowShowingResponse(sb.toString());
        };
    }

    @Bean
    @Description("Lấy danh sách các phim sắp ra mắt, sắp chiếu tại CinemaPTIT. Gọi khi người dùng hỏi phim sắp chiếu, phim mới ra, phim nào sắp ra mắt.")
    public Function<StatusRequest, UpcomingResponse> getUpcomingMovies() {
        return request -> {
            log.info("AI Function getUpcomingMovies called");
            List<MovieResponse> movies = movieService.getUpcomingMovies();
            if (movies.isEmpty()) {
                return new UpcomingResponse("Hiện chưa có thông tin phim sắp chiếu.");
            }
            StringBuilder sb = new StringBuilder("Các phim sắp ra mắt tại CinemaHub:\n");
            for (MovieResponse m : movies) {
                sb.append("- ").append(m.getMovieName())
                        .append(" | Khởi chiếu: ").append(m.getReleaseDate())
                        .append(" | ").append(m.getAgeRating()).append("\n");
            }
            return new UpcomingResponse(sb.toString());
        };
    }

    @Bean
    @Description("Lấy bảng giá vé hiện tại của rạp phim theo từng loại ghế (Thường, VIP, Đôi, v.v). Gọi khi người dùng hỏi giá vé.")
    public Function<StatusRequest, TicketPriceResponse> get_ticket_prices() {
        return request -> {
            log.info("AI Function get_ticket_prices called");
            List<SeatTypePriceResponse> prices = seatTypePriceService.getAllPrice();
            if (prices.isEmpty()) {
                return new TicketPriceResponse("Hệ thống chưa cấu hình giá vé.");
            }
            StringBuilder sb = new StringBuilder("Bảng giá vé tại rạp CinemaPTIT (Áp dụng chung):\n");
            for (SeatTypePriceResponse p : prices) {
                sb.append("- Ghế ").append(p.getSeatType()).append(": ").append(p.getPrice()).append(" VNĐ\n");
            }
            sb.append("\n(Lưu ý: Giá vé có thể thay đổi tùy theo chương trình khuyến mãi nếu có)");
            return new TicketPriceResponse(sb.toString());
        };
    }

    @Bean
    @Description("Tìm kiếm tất cả suất chiếu của một rạp chiếu cụ thể trong ngày hôm nay. Chỉ cần tên rạp (ví dụ: Cầu Giấy, Hà Đông).")
    public Function<BranchShowtimeRequest, ShowtimeResponseData> get_showtimes_by_branch() {
        return request -> {
            log.info("AI Function get_showtimes_by_branch called with params: branchName={}", request.branchName());
            if (request.branchName() == null || request.branchName().isBlank()) {
                return new ShowtimeResponseData("Thiếu tên rạp. Hãy hỏi người dùng muốn xem ở rạp nào.");
            }

            String today = java.time.LocalDate.now().toString();
            List<ShowtimeResponse> allShowtimes = showtimeService.getAll();
            List<ShowtimeResponse> filtered = allShowtimes.stream()
                    .filter(s -> s.getBranchName() != null
                            && s.getBranchName().toLowerCase().contains(request.branchName().toLowerCase()))
                    .filter(s -> s.getStartTime() != null && s.getStartTime().toLocalDate().toString().equals(today))
                    .toList();

            if (filtered.isEmpty()) {
                return new ShowtimeResponseData("Không có suất chiếu nào ở rạp " + request.branchName()
                        + " trong ngày hôm nay (" + today + ").");
            }

            StringBuilder sb = new StringBuilder(
                    "Lịch chiếu ở rạp " + request.branchName() + " hôm nay (" + today + "):\n");
            for (ShowtimeResponse s : filtered) {
                String time = s.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm"));
                sb.append("- Phim: ").append(s.getMovieName())
                        .append(" | Giờ chiếu: ").append(time)
                        .append(" | Phòng chiếu: ").append(s.getRoomName()).append("\n");
            }
            return new ShowtimeResponseData(sb.toString());
        };
    }

    @Bean
    @Description("Tìm kiếm các bộ phim SẮP CHIẾU (trong các ngày tới) tại một rạp cụ thể. Gọi khi người dùng hỏi rạp X sắp tới chiếu phim gì.")
    public Function<BranchShowtimeRequest, ShowtimeResponseData> get_upcoming_movies_by_branch() {
        return request -> {
            log.info("AI Function get_upcoming_movies_by_branch called with params: branchName={}",
                    request.branchName());
            if (request.branchName() == null || request.branchName().isBlank()) {
                return new ShowtimeResponseData("Thiếu tên rạp để tìm phim sắp chiếu.");
            }

            java.time.LocalDate today = java.time.LocalDate.now();
            List<ShowtimeResponse> allShowtimes = showtimeService.getAll();

            // Tìm các suất chiếu từ ngày mai trở đi
            List<ShowtimeResponse> futureShowtimes = allShowtimes.stream()
                    .filter(s -> s.getBranchName() != null
                            && s.getBranchName().toLowerCase().contains(request.branchName().toLowerCase()))
                    .filter(s -> s.getStartTime() != null && s.getStartTime().toLocalDate().isAfter(today))
                    .toList();

            if (futureShowtimes.isEmpty()) {
                return new ShowtimeResponseData("Rạp " + request.branchName()
                        + " hiện chưa có lịch chiếu nào cho các ngày sắp tới (từ ngày mai trở đi).");
            }

            StringBuilder sb = new StringBuilder(
                    "Các phim dự kiến có suất chiếu sắp tới tại rạp " + request.branchName() + ":\n");

            // Nhóm theo tên phim
            java.util.Map<String, List<ShowtimeResponse>> groupedByMovie = futureShowtimes.stream()
                    .filter(s -> s.getMovieName() != null)
                    .collect(Collectors.groupingBy(ShowtimeResponse::getMovieName));

            for (java.util.Map.Entry<String, List<ShowtimeResponse>> entry : groupedByMovie.entrySet()) {
                sb.append("- Phim: ").append(entry.getKey()).append(" (");

                // Lấy ra các ngày chiếu duy nhất của phim này
                List<String> distinctDates = entry.getValue().stream()
                        .map(s -> s.getStartTime().toLocalDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                        .distinct()
                        .sorted()
                        .toList();

                sb.append("Có lịch chiếu vào các ngày: ").append(String.join(", ", distinctDates)).append(")\n");
            }

            return new ShowtimeResponseData(sb.toString());
        };
    }
}
