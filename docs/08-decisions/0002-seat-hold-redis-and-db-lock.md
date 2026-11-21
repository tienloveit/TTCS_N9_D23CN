# ADR-0002: Giữ ghế bằng Redis kết hợp khóa ticket trong DB

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-21 (ghi lại quyết định đã áp dụng)
- **Liên quan:** `BookingCheckoutService`, `BookingTransactionEffects`, `BookingReleaseService`, `BookingCleanupJob`, `TicketService.getTicketsByShowtimeId`; [booking-lifecycle.md](../02-domain/booking-lifecycle.md#giữ-ghế)

## Bối cảnh

Một ghế có thể được chọn cùng lúc bởi nhiều khách online và nhân viên quầy. Khách cần vài phút để thanh toán VNPay. Trong thời gian đó ghế phải được dành riêng, và không ai được bán ghế đó. Nếu khách bỏ dở, ghế phải tự trả lại. Sơ đồ ghế của người khác phải thấy ghế đang được giữ.

## Quyết định

Ghế đang giữ được ghi ở cả hai nơi, mỗi nơi một vai trò:

- **MySQL là nguồn chính.** Mọi vé của suất tồn tại sẵn. Tạo đơn khóa các dòng `tickets` bằng `SELECT ... FOR UPDATE` theo thứ tự id, yêu cầu tất cả `AVAILABLE`, rồi chuyển sang `HOLDING` và gắn `booking_id` trong cùng transaction.
- **Redis là khóa có thời hạn.** Mỗi ghế có key `seat_hold:{showtimeId}:{seatId}` với giá trị là mã đơn, lấy bằng `SET NX` với TTL `booking.holdMinutes`. Khóa chỉ được xóa bởi đúng đơn sở hữu (Lua compare-and-delete), và chỉ sau khi transaction commit. Transaction rollback thì nhả khóa đã lấy.
- Sơ đồ ghế gộp hai nguồn: vé `BOOKED` trong DB luôn là `BOOKED`, có khóa Redis là `HOLDING`, còn lại theo DB.
- Bán tại quầy kiểm tra thêm khóa Redis trước khi khóa DB, vì khách online có thể đang giữ ghế.
- `BookingCleanupJob` chạy mỗi 120 giây, trả ghế của đơn quá `expiresAt` trong DB.

## Phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| DB lock + Redis TTL (đã chọn) | DB bảo đảm không bán trùng. Redis cho hiển thị nhanh và có giới hạn thời gian khi job chậm hoặc lỗi. | Hai nguồn phải đồng bộ. Phải xử lý sau commit và chủ sở hữu khóa. |
| Chỉ DB (`HOLDING` + `expires_at`) | Một nguồn sự thật | Ghế chỉ được trả khi job chạy. Mọi lần hiển thị sơ đồ phải tính hạn trong SQL. |
| Chỉ Redis | Nhanh, TTL tự nhiên | Redis mất dữ liệu thì có thể bán trùng. Không có ràng buộc toàn vẹn với đơn. |
| Khóa lạc quan (`@Version`) trên ticket | Không giữ khóa dòng lâu | Hai người cùng chọn ghế thì một người nhận lỗi muộn, vẫn cần cơ chế giữ ghế trong lúc thanh toán |

## Hệ quả

- Không thể bán trùng một ghế dù Redis lỗi, vì DB khóa dòng và kiểm tra `AVAILABLE`.
- Khóa Redis hết TTL không phát sự kiện WebSocket. Ghế chỉ được phát `AVAILABLE` khi job chạy, tối đa khoảng 2 phút sau hạn.
- Callback VNPay tới sau `expiresAt` nhưng trước khi job chạy vẫn xuất vé được, vì ghế vẫn `HOLDING` cho đúng đơn trong DB.
- Code thay đổi luồng giữ ghế phải đi qua `BookingTransactionEffects` và `BookingReleaseService`, không tự thao tác key Redis.
