package com.ltweb.backend.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Ticket;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class EmailService {

  private static final DateTimeFormatter SHOWTIME_FORMATTER =
      DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
  private static final int QR_SIZE = 240;

  private final JavaMailSender mailSender;

  public void sendOtp(String toEmail, String otp) {
    SimpleMailMessage message = new SimpleMailMessage();
    message.setTo(toEmail);
    message.setSubject("Reset Password OTP");
    message.setText("Your OTP is: " + otp + ". It expires in 5 minutes.");

    mailSender.send(message);
  }

  public void sendBookingTickets(Booking booking)
      throws MessagingException, IOException, WriterException {
    if (booking == null || booking.getUser() == null) {
      return;
    }

    String toEmail = booking.getUser().getEmail();
    if (!StringUtils.hasText(toEmail)) {
      return;
    }

    List<Ticket> tickets =
        booking.getTickets() == null
            ? List.of()
            : booking.getTickets().stream()
                .sorted(
                    Comparator.comparing(
                        ticket ->
                            ticket.getSeat() == null
                                ? ""
                                : nullToEmpty(ticket.getSeat().getSeatCode())))
                .toList();
    if (tickets.isEmpty()) {
      return;
    }

    MimeMessage message = mailSender.createMimeMessage();
    MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
    helper.setTo(toEmail);
    helper.setSubject("MoviePTIT - Ve xem phim " + nullToEmpty(booking.getBookingCode()));
    helper.setText(buildBookingTicketEmail(booking, tickets), true);

    for (int i = 0; i < tickets.size(); i++) {
      Ticket ticket = tickets.get(i);
      helper.addInline(
          getQrContentId(i),
          new ByteArrayResource(generateQrCodePng(getTicketQrValue(booking, ticket))),
          "image/png");
    }

    mailSender.send(message);
  }

  private String buildBookingTicketEmail(Booking booking, List<Ticket> tickets) {
    String movieName =
        booking.getShowtime() == null || booking.getShowtime().getMovie() == null
            ? "MoviePTIT"
            : booking.getShowtime().getMovie().getMovieName();
    String roomName =
        booking.getShowtime() == null || booking.getShowtime().getRoom() == null
            ? ""
            : booking.getShowtime().getRoom().getName();
    String branchName =
        booking.getShowtime() == null
                || booking.getShowtime().getRoom() == null
                || booking.getShowtime().getRoom().getBranch() == null
            ? ""
            : booking.getShowtime().getRoom().getBranch().getName();
    String showtime =
        booking.getShowtime() == null ? "" : formatDateTime(booking.getShowtime().getStartTime());

    StringBuilder ticketRows = new StringBuilder();
    for (int i = 0; i < tickets.size(); i++) {
      Ticket ticket = tickets.get(i);
      String seatCode = ticket.getSeat() == null ? "" : ticket.getSeat().getSeatCode();
      ticketRows
          .append("<tr><td style=\"padding:16px 0;border-top:1px solid #e5e7eb;\">")
          .append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">")
          .append("<tr>")
          .append("<td style=\"vertical-align:top;padding-right:16px;\">")
          .append("<div style=\"font-size:13px;color:#64748b;text-transform:uppercase;\">Ve ")
          .append(i + 1)
          .append("</div>")
          .append("<div style=\"font-size:22px;font-weight:800;color:#111827;margin-top:4px;\">Ghe ")
          .append(escapeHtml(seatCode))
          .append("</div>")
          .append("<div style=\"font-size:13px;color:#64748b;margin-top:8px;\">Ma ve</div>")
          .append("<div style=\"font-family:monospace;font-size:14px;color:#111827;\">")
          .append(escapeHtml(getTicketQrValue(booking, ticket)))
          .append("</div>")
          .append("</td>")
          .append("<td width=\"150\" style=\"text-align:right;vertical-align:top;\">")
          .append("<img src=\"cid:")
          .append(getQrContentId(i))
          .append("\" width=\"140\" height=\"140\" alt=\"QR ve ")
          .append(escapeHtml(seatCode))
          .append("\" style=\"display:inline-block;border:1px solid #e5e7eb;\"/>")
          .append("</td>")
          .append("</tr></table></td></tr>");
    }

    return """
        <!doctype html>
        <html>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
              <tr>
                <td align="center">
                  <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%%;background:#ffffff;border:1px solid #e5e7eb;">
                    <tr>
                      <td style="padding:28px 32px 20px;background:#111827;color:#ffffff;">
                        <div style="font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#cbd5e1;">MoviePTIT</div>
                        <h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;">Thanh toan thanh cong</h1>
                        <p style="margin:8px 0 0;color:#d1d5db;">Ve dien tu cua ban da san sang. Vui long dua tung ma QR khi vao rap.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:24px 32px;">
                        <h2 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#111827;">%s</h2>
                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.7;">
                          <tr><td style="color:#64748b;">Ma dat ve</td><td align="right" style="font-family:monospace;font-weight:700;">%s</td></tr>
                          <tr><td style="color:#64748b;">Suat chieu</td><td align="right">%s</td></tr>
                          <tr><td style="color:#64748b;">Rap</td><td align="right">%s</td></tr>
                          <tr><td style="color:#64748b;">Phong</td><td align="right">%s</td></tr>
                          <tr><td style="color:#64748b;">Tong tien</td><td align="right" style="font-weight:700;">%s</td></tr>
                        </table>
                        <div style="height:12px;"></div>
                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                          %s
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """
        .formatted(
            escapeHtml(movieName),
            escapeHtml(booking.getBookingCode()),
            escapeHtml(showtime),
            escapeHtml(branchName),
            escapeHtml(roomName),
            escapeHtml(formatCurrency(booking.getTotalAmount())),
            ticketRows);
  }

  private byte[] generateQrCodePng(String value) throws WriterException, IOException {
    QRCodeWriter qrCodeWriter = new QRCodeWriter();
    BitMatrix bitMatrix = qrCodeWriter.encode(value, BarcodeFormat.QR_CODE, QR_SIZE, QR_SIZE);
    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
    return outputStream.toByteArray();
  }

  private String getTicketQrValue(Booking booking, Ticket ticket) {
    if (StringUtils.hasText(ticket.getQrCode())) {
      return ticket.getQrCode();
    }
    return "CINEMAHUB|BOOKING="
        + nullToEmpty(booking.getBookingCode())
        + "|TICKET="
        + ticket.getId()
        + "|SEAT="
        + (ticket.getSeat() == null ? "" : nullToEmpty(ticket.getSeat().getSeatCode()));
  }

  private String getQrContentId(int index) {
    return "ticketQr" + index;
  }

  private String formatDateTime(LocalDateTime value) {
    return value == null ? "" : value.format(SHOWTIME_FORMATTER);
  }

  private String formatCurrency(BigDecimal amount) {
    if (amount == null) {
      return "";
    }
    NumberFormat formatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
    return formatter.format(amount);
  }

  private String nullToEmpty(String value) {
    return value == null ? "" : value;
  }

  private String escapeHtml(String value) {
    if (value == null) {
      return "";
    }
    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;");
  }
}
