package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.TicketStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TicketResponse {

  private Long id;

  private BigDecimal price;

  /** Trạng thái raw trong DB */
  private TicketStatus ticketStatus;

  private Long showtimeId;

  private Long seatId;

  private Long bookingId;

  // đặc điểm của ghế
  private String seatCode;

  private String rowLabel;

  private Integer seatNumber;

  /**
   * Trạng thái hiển thị cho frontend, kết hợp DB + Redis seat lock. - AVAILABLE : ghế trống, có thể
   * chọn - HOLDING : đang bị khóa tạm thời bởi user khác (Redis) - BOOKED : đã thanh toán thành
   * công
   */
  private TicketStatus displayStatus;

  private String qrCode;

  private LocalDateTime checkedInAt;
}
