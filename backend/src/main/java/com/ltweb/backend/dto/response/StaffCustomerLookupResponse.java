package com.ltweb.backend.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * Kết quả tra cứu khách tại quầy. Thông tin đã che bớt: đủ để nhân viên hỏi lại khách ("Có phải anh
 * N. V. Nam không?") nhưng không lộ đầy đủ dữ liệu cá nhân của tài khoản.
 */
@Data
@Builder
public class StaffCustomerLookupResponse {
  /** Có tài khoản trùng email/SĐT hay không. False: bán vé sẽ tạo khách vãng lai mới. */
  private boolean matched;

  private Long customerId;

  private String maskedName;

  private String maskedEmail;

  private String maskedPhone;

  /** Tên hạng hiển thị (Đồng, Bạc, Vàng, Bạch Kim). */
  private String membershipTier;

  /** Tài khoản khách vãng lai do quầy tạo trước đó (không đăng nhập được). */
  private boolean guestAccount;

  /** Liên hệ đã chuẩn hóa mà backend sẽ dùng khi tạo khách mới. */
  private String normalizedPhone;

  private String normalizedEmail;
}
