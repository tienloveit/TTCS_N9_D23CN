# Thuật ngữ

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Cột "Trong code" là tên entity, field hoặc enum. Giá trị chi tiết của từng enum nằm trong [data-dictionary.md](../05-database/data-dictionary.md).

## Rạp và lịch chiếu

| Thuật ngữ | Trong code | Nghĩa |
| --- | --- | --- |
| Chi nhánh, rạp | `Branch` | Một địa điểm rạp, có mã `branchCode` (ví dụ `CN-HCM-01`). Nhân viên và quản lý thuộc một chi nhánh qua `User.branchId`. |
| Phòng chiếu | `Room` | Phòng trong một chi nhánh. Mã phòng `code` là duy nhất trong chi nhánh. |
| Sức chứa | `Room.seatCapacity` | Số ghế thật của phòng, được cập nhật mỗi khi thêm, xóa hoặc chuyển ghế. Báo cáo tỷ lệ lấp đầy dùng giá trị này. |
| Ghế | `Seat` | Một vị trí trong phòng, có `seatCode` (ví dụ `A5`), `rowLabel`, `seatNumber` và loại ghế `seatType`. |
| Loại ghế | `SeatType` | `STANDARD` (thường), `VIP`, `COUPLE` (ghế đôi). Hiện chỉ dùng để hiển thị, không ảnh hưởng giá. |
| Công nghệ phòng | `Room.roomTechnology` | Thiết bị của phòng: `STANDARD`, `IMAX`, `FOUR_DX`, `SCREEN_X`, `GOLD_CLASS`. |
| Định dạng chiếu | `Showtime.screeningFormat` | Bản phim được chiếu: `TWO_D` (2D) hoặc `THREE_D` (3D). |
| Suất chiếu | `Showtime` | Một lần chiếu một phim trong một phòng, có giờ bắt đầu, giờ kết thúc, định dạng chiếu và giá vé `ticketPrice`. |
| Giá vé suất | `Showtime.ticketPrice` | Giá dùng chung cho mọi ghế của suất. |
| Vé | `Ticket` | Một ghế của một suất. Mọi vé được tạo sẵn khi tạo suất, kể cả khi chưa ai mua. `Ticket.price` chụp giá tại thời điểm tạo. |

### Vì sao tách công nghệ phòng và định dạng chiếu

Trước đây phòng được đánh dấu "2D" hoặc "3D", nên muốn chiếu một phim 3D phải có phòng 3D riêng, và phòng IMAX không thể ghi nhận là đang chiếu bản 2D hay 3D. Thực tế hai thứ này độc lập: công nghệ là thuộc tính cố định của phòng (màn IMAX, ghế 4DX), còn 2D hay 3D là thuộc tính của từng suất. Một phòng IMAX có thể chiếu suất 2D lúc 10 giờ và suất 3D lúc 14 giờ. Vì vậy `roomTechnology` nằm ở `Room` và `screeningFormat` nằm ở `Showtime`. Quyết định này được ghi trong [ADR-0007](../08-decisions/0007-room-technology-vs-screening-format.md).

## Đặt vé và thanh toán

| Thuật ngữ | Trong code | Nghĩa |
| --- | --- | --- |
| Đơn, đơn hàng | `Booking` | Một lần mua gồm một hoặc nhiều vé của cùng một suất, có thể kèm bắp nước. Khóa chính trong DB là `id`, JSON trả về là `bookingId`. |
| Mã đơn | `Booking.bookingCode` | Mã dạng `BK-YYYYMMDD-XXXXXXXX`, 8 ký tự Crockford base32 ngẫu nhiên. Dùng để tra cứu và soát vé nên được sinh khó đoán. |
| Giữ ghế | Redis `seat_hold:{showtimeId}:{seatId}`, `TicketStatus.HOLDING` | Ghế được dành cho một đơn chờ thanh toán trong `booking.holdMinutes` phút. Xem [booking-lifecycle.md](booking-lifecycle.md#giữ-ghế). |
| Hạn giữ ghế | `Booking.expiresAt` | Thời điểm đơn chờ thanh toán hết hạn. Frontend đếm ngược theo giá trị này. |
| Đơn online | `Booking.staffUser = null` | Đơn khách tự đặt trên website. |
| Đơn tại quầy | `Booking.staffUser` khác null, cột `booked_staff` | Đơn do nhân viên bán. `staffUser` là người bán. JSON trả `staffUserId`, `staffUsername`. |
| Khách vãng lai | `User` có `username` bắt đầu bằng `guest_` | Tài khoản USER do quầy tạo tự động khi khách chưa có tài khoản. Khách không đăng nhập được bằng tài khoản này. |
| Bắp nước | `Food`, `BookingFood` | Món ăn uống. `BookingFood` chụp số lượng, đơn giá và thành tiền lúc đặt. |
| Thanh toán | `Payment` | Thông tin thanh toán của một đơn, quan hệ một-một với `Booking`. Xem [ADR-0003](../08-decisions/0003-separate-payment-from-booking.md). |
| Phương thức thanh toán | `PaymentMethod` | `CASH` (tiền mặt), `VNPAY`, `CARD` (có trong enum, chưa có luồng xử lý riêng). |
| Mã giao dịch VNPay | `Payment.providerTxnId` | `vnp_TransactionNo` VNPay trả về. Bắt buộc để hoàn tiền qua VNPay. |
| Thanh toán trễ | `LATE_PAYMENT_REFUND_REASON` | VNPay báo thành công sau khi đơn đã bị hủy hoặc mất ghế. Đơn chuyển sang chờ hoàn tiền thay vì xuất vé. |
| Nhật ký thanh toán | `PaymentEvent`, bảng `payment_events` | Bản ghi chỉ thêm, không sửa, cho mỗi callback VNPay và mỗi lần gửi hoặc truy vấn hoàn tiền. |
| Check-in, soát vé | `Ticket.checkedInAt`, `Ticket.checkedInBy` | Ghi nhận khách đã vào phòng. Không phải một trạng thái vé riêng. |
| Hoàn tiền | `BookingStatus.REFUND_REQUESTED`, `REFUNDED` | Trả lại toàn bộ tiền của đơn. Xem [payment-refund.md](payment-refund.md). |
| Hạn yêu cầu hoàn | `refundDeadline` | `paidAt + refund.windowHours`. Backend tính và trả trong JSON, frontend không tự cộng. |

## Khách hàng và khuyến mãi

| Thuật ngữ | Trong code | Nghĩa |
| --- | --- | --- |
| Hạng thành viên | `MembershipTier` | `BRONZE` (Đồng), `SILVER` (Bạc), `GOLD` (Vàng), `PLATINUM` (Bạch Kim), tính theo tổng chi tiêu. |
| Tổng chi tiêu | `User.totalSpending` | Tổng tiền các đơn đã thanh toán, trừ đơn đã hoàn. |
| Mã khuyến mãi | `Promotion.code` | Mã giảm theo phần trăm, có thể giới hạn chi nhánh, hạng, giá trị đơn tối thiểu, thời gian và số lượt. |
| Giữ lượt khuyến mãi | `Booking.promotionUsageReserved` | Lượt dùng được trừ ngay khi tạo đơn hoặc áp mã, trả lại nếu đơn không được thanh toán. |

## Vận hành

| Thuật ngữ | Trong code | Nghĩa |
| --- | --- | --- |
| Nhật ký thao tác | `AuditLog` | Ghi lại thao tác nhạy cảm: bán tại quầy, soát vé, gửi hoặc duyệt hoàn, sửa bắp nước, sửa cấu hình. |
| Thông báo | `Notification`, `NotificationRead` | Thông báo trong ứng dụng gửi tới một người hoặc một vai trò ở một chi nhánh. |
| Cấu hình hệ thống | `SystemSetting` | Tham số nghiệp vụ ADMIN chỉnh được. Xem [tham số nghiệp vụ](overview.md#tham-số-nghiệp-vụ). |
| Giờ rạp | `Clock` theo `Asia/Ho_Chi_Minh` | Múi giờ dùng cho mọi mốc thời gian nghiệp vụ, không phụ thuộc múi giờ máy chủ hay trình duyệt. |
| Đối soát két | `cashCollected`, `cashRefunded`, `cashExpected` | Số tiền mặt nhân viên thu, hoàn và phải có trong két trong ngày. Xem [payment-refund.md](payment-refund.md#đối-soát-tiền-mặt-tại-quầy). |
