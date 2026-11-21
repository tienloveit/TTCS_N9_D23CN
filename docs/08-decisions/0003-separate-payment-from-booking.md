# ADR-0003: Tách `Payment` khỏi `Booking`

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-21 (ghi lại quyết định áp dụng từ script `20261111_extract_booking_payments.sql`)
- **Liên quan:** `entity/Booking.java`, `entity/Payment.java`, `BookingMapper`; [erd.md](../05-database/erd.md#các-quan-hệ-quan-trọng)

## Bối cảnh

Ban đầu bảng `bookings` chứa cả thông tin đơn (suất, ghế, khách, giảm giá) lẫn thông tin thanh toán (phương thức, trạng thái, mã giao dịch, các trường hoàn tiền). Khi thêm hoàn tiền qua VNPay với marker lần thử, mã phản hồi cổng, người xử lý, bảng `bookings` ngày càng nhiều cột chỉ có ý nghĩa với một phần đơn, và logic thanh toán lẫn với logic đơn trong cùng entity.

## Quyết định

- Tạo bảng `payments` quan hệ một-một với `bookings` (`payments.booking_id` `UNIQUE`, `ON DELETE CASCADE`).
- `Payment` giữ phương thức, trạng thái thanh toán, số tiền, mã giao dịch VNPay, các mốc thời gian thanh toán và toàn bộ trường hoàn tiền. `Booking` giữ trạng thái vòng đời đơn, số tiền và khuyến mãi.
- `Booking` luôn có một `Payment`: entity khởi tạo sẵn và gắn lại trong `@PrePersist`.
- **Hợp đồng JSON không đổi.** `BookingMapper` phẳng hóa các trường của `payment` vào `BookingResponse` (`paymentMethod`, `paymentStatus`, `paidAt`, `refundGatewayStatus`...). Frontend không đọc `booking.payment.*`.

## Phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| Bảng riêng một-một (đã chọn) | Tách trách nhiệm, dễ thêm trường thanh toán. Không đổi API. | Thêm một join. Phải giữ mapping phẳng trong mapper. |
| Giữ chung một bảng | Không cần migration | Bảng phình to, nhiều cột null |
| Một-nhiều (nhiều lần thanh toán cho một đơn) | Lưu được mọi lần thử thanh toán | Phức tạp hơn nhu cầu: một đơn chỉ thanh toán một lần. Lịch sử từng callback đã nằm ở `payment_events` (V5). |

## Hệ quả

- Database cũ phải chạy `20261111_extract_booking_payments.sql` trước Flyway. Xem [migrations.md](../05-database/migrations.md#script-chạy-tay-cho-database-rất-cũ).
- Query báo cáo phải join `payments` khi lọc theo phương thức hoặc ngày thanh toán.
- `payments` chỉ giữ trạng thái và lần hoàn gần nhất. Lịch sử đầy đủ nằm ở `payment_events`.
