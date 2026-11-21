# Gửi email

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Backend gửi mail qua Gmail SMTP bằng Spring Mail (`JavaMailSender`). Mọi nội dung nằm trong [EmailService.java](../../backend/src/main/java/com/ltweb/backend/service/EmailService.java).

## Cấu hình Gmail

Gmail không cho đăng nhập SMTP bằng mật khẩu tài khoản. Dùng **App Password**:

1. Bật xác minh 2 bước cho tài khoản Google dùng để gửi.
2. Vào Google Account → Security → App passwords, tạo một mật khẩu ứng dụng (16 ký tự).
3. Điền vào `backend/.env`:

   ```dotenv
   SPRING_MAIL_USERNAME=<địa chỉ gmail gửi đi>
   SPRING_MAIL_PASSWORD=<app password, bỏ dấu cách>
   ```

Cấu hình cố định trong `application.yaml`: `smtp.gmail.com`, cổng 587, `auth` và `starttls.required` bật, timeout kết nối, đọc và ghi đều 5 giây. Dùng nhà cung cấp SMTP khác thì ghi đè `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`.

`SPRING_MAIL_PASSWORD` là bí mật. Hai biến mail là bắt buộc để backend khởi động. Nếu chưa cần gửi mail, điền giá trị giả.

## Các loại email

| Email | Khi nào gửi | Nội dung | Gọi từ |
| --- | --- | --- | --- |
| OTP đặt lại mật khẩu | `POST /auth/forgot-password` với email đã có tài khoản | Văn bản thuần, tiêu đề "Reset Password OTP", OTP 6 chữ số, hết hạn sau 5 phút | `PasswordRecoveryService.forgotPassword` |
| Vé điện tử | Đơn được thanh toán: VNPay thành công hoặc tiền mặt tại quầy | HTML, tiêu đề "MoviePTIT - Vé xem phim <mã đơn>". Thông tin phim, rạp, phòng, giờ chiếu, tổng tiền, mỗi vé một ảnh QR PNG 240×240 nhúng inline | `BookingTicketEmailListener.sendTicketEmail` |

### OTP

- Sinh bằng `SecureRandom`, lưu ở Redis `otp:code:{email}` với TTL 5 phút. Đặt lại mật khẩu thành công thì xóa OTP.
- Bộ đếm `otp:limit:{email}` tăng mỗi lần gửi, TTL được đặt lại 1 phút sau mỗi lần tăng. Vượt 5 lần trả 429 `OTP_RATE_LIMIT`, nên người dùng phải ngừng gửi 1 phút mới thử lại được.
- Email không tồn tại trả `USER_NOT_FOUND`. Gửi SMTP lỗi trả 500 `INTERNAL_ERROR` và ghi log.

### Vé điện tử

- Mã QR được tạo bằng ZXing (`QRCodeWriter`, `MatrixToImageWriter`) từ `Ticket.qrCode`, cùng chuỗi mà quầy soát vé kiểm tra.
- Không gửi nếu đơn không có khách, khách không có email (khách vãng lai chỉ có SĐT) hoặc đơn không có vé.

## Thời điểm gửi

Email vé chạy **sau khi transaction thanh toán commit**:

1. Service thanh toán phát `BookingPaidEvent(bookingId)`.
2. `BookingTicketEmailListener` nghe bằng `@TransactionalEventListener(phase = AFTER_COMMIT)`, mở transaction mới chỉ đọc (`REQUIRES_NEW`), tải lại đơn rồi gửi.
3. Lỗi gửi mail chỉ ghi log `Could not send ticket email for booking ...`. Đơn vẫn hoàn tất, khách vẫn xem vé trong "Vé của tôi".

Nhờ vậy, khách không nhận email cho một thanh toán bị rollback, và SMTP chậm không giữ khóa dòng booking. Email gửi đồng bộ trong luồng xử lý sau commit, nên làm chậm phản hồi của callback thanh toán tối đa bằng timeout SMTP.

## Thử mà không gửi mail thật

| Cách | Làm thế nào | Phù hợp khi |
| --- | --- | --- |
| Giá trị giả | Điền `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` giả | Không cần thử mail. Gửi mail sẽ lỗi và ghi log, các luồng khác vẫn chạy. |
| SMTP giả cục bộ | Chạy Mailpit: `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`, đặt `SPRING_MAIL_HOST=localhost`, `SPRING_MAIL_PORT=1025`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_REQUIRED=false`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=false` | Muốn xem nội dung email vé và OTP tại `http://localhost:8025` |
| Dữ liệu demo bằng SQL | `demo-seed.mjs` ghi đơn đã thanh toán bằng SQL nên không phát sự kiện gửi mail | Tạo nhiều đơn mẫu |
| Unit test | Giả lập `JavaMailSender` hoặc `EmailService` | Test service |

Tài khoản demo `user` có email cấu hình sẵn trong seed. Đổi email đó trước khi thử nếu không muốn mail vé tới hộp thư thật.
