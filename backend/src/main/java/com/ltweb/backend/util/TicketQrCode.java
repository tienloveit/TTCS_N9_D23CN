package com.ltweb.backend.util;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Ticket;
import org.springframework.util.StringUtils;

/** Nội dung mã QR in trên vé, dùng chung cho lúc xuất vé, email và soát vé. */
public final class TicketQrCode {
  private TicketQrCode() {}

  /** Giữ mã đã cấp cho vé; vé chưa có mã thì dựng từ mã đơn, id vé và mã ghế. */
  public static String of(Booking booking, Ticket ticket) {
    if (StringUtils.hasText(ticket.getQrCode())) {
      return ticket.getQrCode();
    }
    String seatCode = ticket.getSeat() == null ? null : ticket.getSeat().getSeatCode();
    return "CINEMAHUB|BOOKING="
        + nullToEmpty(booking.getBookingCode())
        + "|TICKET="
        + ticket.getId()
        + "|SEAT="
        + nullToEmpty(seatCode);
  }

  private static String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
