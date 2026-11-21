package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StaffBookingRequest {

  @NotNull(message = "Showtime ID is required")
  private Long showtimeId;

  @NotEmpty(message = "At least one seat ID is required")
  private List<Long> seatIds;

  @Valid private List<CreateBookingFoodRequest> foods = new ArrayList<>();

  private String customerName;

  private String customerEmail;

  private String customerPhone;

  /**
   * ID tài khoản khách mà nhân viên đã xác nhận qua {@code GET /staff/customers/lookup}. Bắt buộc
   * khi email/SĐT trùng một tài khoản có sẵn, để đơn và vé không gắn nhầm người.
   */
  private Long confirmedCustomerId;

  private PaymentMethod paymentMethod = PaymentMethod.CASH;

  private String promotionCode;
}
