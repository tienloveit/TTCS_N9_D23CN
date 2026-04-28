package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentMethod;
import com.ltweb.backend.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BookingResponse {

  private Long bookingId;

  private String bookingCode;

  private Long userId;

  private String username;

  private Long showtimeId;

  private BigDecimal totalAmount;

  private BookingStatus status;

  private LocalDateTime expiresAt;

  private LocalDateTime createdAt;

  private LocalDateTime updatedAt;

  // Seat codes
  private List<String> seatCodes;

  private PaymentMethod paymentMethod;

  private PaymentStatus paymentStatus;

  private String providerTxnId;

  private LocalDateTime paidAt;

  private LocalDateTime paymentCreatedAt;

  // chi tiết xuất chiếu để hiển thị, lấy từ showtime (bên trong có movie)
  private String movieName;
  private String movieThumbnailUrl;
  private String roomName;
  private String branchName;
  private LocalDateTime showtimeStart;
  private LocalDateTime showtimeEnd;

  private List<TicketResponse> tickets;

  private List<BookingFoodResponse> foods;
}
