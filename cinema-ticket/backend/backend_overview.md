# MoviePTIT — Backend Context

Cập nhật: **2026-11-12**, theo mã nguồn working tree, bao gồm thay đổi chưa commit. Xem [context toàn dự án](../codex.md) và [frontend context](../frontend/README.md).

## Runtime và cấu hình

Java **21**, Spring Boot **3.4.0**, Maven; Spring Web, Security/OAuth2 Resource Server, Data JPA/JDBC, Redis, WebSocket/STOMP, Mail, MapStruct, Lombok, ZXing. Cấu hình nằm tại `src/main/resources/application.yaml`.

| Thành phần | Mặc định |
| --- | --- |
| API | `http://localhost:8081/api` (`server.port: 8081`, context path `/api`) |
| MySQL | `jdbc:mysql://localhost:3306/cinema`, user `root` |
| Redis | `localhost:6379` |
| JPA | `ddl-auto: update`, bật SQL log |
| Email | Gmail SMTP, cổng 587, STARTTLS |
| OAuth2 | Google; redirect frontend `/oauth2/callback` |
| VNPay | Sandbox; frontend return `/payment/vnpay-return` |
| Upload | File tối đa 5MB, request tối đa 6MB |

Biến môi trường bắt buộc theo YAML: `SPRING_DATASOURCE_PASSWORD`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `JWT_SECRET_KEY`, `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY`. Google login cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; redirect có thể đổi bằng `APP_OAUTH2_SUCCESS_URL`, `APP_OAUTH2_FAILURE_URL`. YAML import các `.env` tùy chọn. Không đưa giá trị bí mật vào tài liệu.

Từ thư mục `cinema-ticket/backend`:

```powershell
mvn spring-boot:run
mvn -q -DskipTests compile
mvn test
mvn -q -DskipTests package
```

MySQL/Redis phải sẵn sàng cho runtime. `ApplicationInitConfig`/`DataSeedService` khởi tạo dữ liệu demo; đọc seed trước khi dùng trên dữ liệu thật. `seed-data.ps1` có bước cleanup/reset dữ liệu, không phải lệnh chạy ứng dụng thông thường.

## Kiến trúc và nơi đọc code

`controller` nhận request → `service` kiểm tra quyền, nghiệp vụ và transaction → `repository` truy cập entity → `mapper` tạo DTO. `config` chứa Security/JWT/Redis/WebSocket/VNPay/OAuth2; `exception` chứa `AppException`, `ErrorCode`, handler; `event` chứa sự kiện thanh toán; `job` dọn đơn hết hạn.

Response thành công thường bọc `ApiResponse<T>` với `code`, `message`, `result`; lỗi dùng `ErrorResponse` qua `GlobalExceptionHandler`. Xuất XLSX trả trực tiếp `ResponseEntity<byte[]>`. Đọc DTO/mapper để xác định hợp đồng JSON thay vì dùng tên field entity.

## Dữ liệu và trạng thái

| Domain | Mô hình hiện tại |
| --- | --- |
| Tài khoản | `User`: ADMIN/MANAGER/STAFF/USER, ACTIVE/INACTIVE/BLOCKED, `branchId`, membership và tổng chi tiêu |
| Phim | `Movie` liên kết Director và Genre; có `originalTitle`, `castNames`, `bannerUrl`, `isPublic`, timestamps; `MovieRating` theo cặp movie/user |
| Rạp/phòng | Branch → Room; phòng có `roomTechnology`: STANDARD/IMAX/FOUR_DX/SCREEN_X/GOLD_CLASS |
| Ghế | Room → Seat; STANDARD/VIP/COUPLE; không còn `isActive` |
| Suất chiếu | Movie + Room + thời gian + `screeningFormat` TWO_D/THREE_D + `ticketPrice` |
| Vé | Ticket gắn showtime/seat, có thể gắn booking; giá snapshot, QR, `checkedInAt`, `checkedInBy` |
| Đơn hàng | Booking gắn user/showtime, `staffUser` qua cột `booked_staff`, promotion, discount, tickets và BookingFood |
| Thanh toán | Payment một-một với Booking, chứa phương thức/trạng thái/số tiền/giao dịch và các trường hoàn tiền |
| Bắp nước | Food theo phạm vi chi nhánh, active, giá, stockQuantity/lowStockThreshold; BookingFood chụp số lượng/đơn giá/thành tiền |
| Vận hành | Promotion, SystemSetting, AuditLog, Notification; RedisToken quản lý trạng thái token |

Các enum cần giữ đúng:

- `MovieStatus`: UPCOMING, NOW_SHOWING, ENDED. Hiển thị công khai dùng `isPublic`, không còn INACTIVE.
- `ShowtimeStatus`: OPEN, CLOSED, CANCELLED.
- `TicketStatus`: AVAILABLE, HOLDING, BOOKED. Check-in không phải trạng thái enum riêng.
- `BookingStatus`: PENDING, CANCELLED, EXPIRED, COMPLETED, REFUND_REQUESTED, REFUNDED. Job hiện chuyển đơn hết hạn thành CANCELLED.
- `PaymentStatus`: PENDING, PAID, CANCELLED, REFUNDED; `PaymentMethod`: CASH, CARD, VNPAY.
- `NotificationType`: BOOKING_STATUS, PROMOTION, REFUND_REQUEST, LOW_STOCK, SYSTEM.

Entity dùng PK `id`. Các ràng buộc đáng chú ý: room `(branch_id, code)`; seat `(room_id, seat_code)` và `(room_id, row_label, seat_number)`; ticket `(showtime_id, seat_id)`; payment unique `booking_id`; booking code unique, không null. DTO có thể giữ tên `bookingId` dù entity dùng `id`.

`BookingMapper` ánh xạ các trường của `payment` thành các field phẳng trong `BookingResponse`. Không chuyển frontend sang đọc `booking.payment.*` khi chỉ thay persistence.

## Auth và phân quyền

JWT HS512; access token 30 phút, refresh token 30 ngày. Redis lưu refresh token còn hiệu lực và access token đã thu hồi. Refresh tiêu thụ token cũ rồi cấp cặp mới; logout blacklist access token đến khi hết hạn. Role claim được chuyển thành `ROLE_*`; quyền chi nhánh/chủ sở hữu còn được kiểm tra trong service.

OTP dùng SecureRandom tạo chuỗi 6 chữ số, TTL 5 phút, key `otp:code:{email}`. Bộ đếm `otp:limit:{email}` từ chối khi vượt 5 lần; TTL bộ đếm được đặt lại 1 phút sau mỗi lần increment.

`SecurityConfig` cho public các endpoint đăng ký/đăng nhập/refresh/quên mật khẩu, OAuth2, callback VNPay, WebSocket, một số GET danh mục và cleanup. GET public ở filter vẫn có thể bị chặn bởi method security. Các route khác yêu cầu auth; đọc cả controller lẫn service để xác định quyền đầy đủ.

- ADMIN có phạm vi toàn hệ thống; MANAGER/STAFF chịu kiểm tra chi nhánh trong các nghiệp vụ tương ứng.
- Bán vé tại quầy và staff dashboard: ADMIN/STAFF.
- Check-in: ADMIN/STAFF/MANAGER; manager/staff trong chi nhánh được phân công.
- Quản lý hoàn tiền và báo cáo: ADMIN/MANAGER, có kiểm tra phạm vi chi nhánh.
- System settings: ADMIN.
- Thông báo: mọi tài khoản đăng nhập, lọc theo người nhận/role/chi nhánh.

CORS hiện cho localhost và 127.0.0.1 ở cổng 5173/5174/3000. Danh sách method hiện là GET/POST/PUT/DELETE/OPTIONS; API áp mã khuyến mãi dùng PATCH, cần lưu ý cấu hình này khi xử lý lỗi preflight.

## Đặt vé và transaction

### Khách đặt online

1. `POST /booking` → `BookingService.createBooking`: lấy user, kiểm tra giới hạn vé/giao dịch, suất chiếu hợp lệ, seatIds không trùng.
2. Lấy ticket bằng truy vấn khóa `findSeatsForUpdate`; tất cả phải AVAILABLE. Kiểm tra bắp nước/chi nhánh, reserve tồn, tính giá và khuyến mãi phía server.
3. `BookingTransactionEffects.acquire` tạo Redis key `seat_hold:{showtimeId}:{seatId}`, giá trị là booking code, TTL theo `booking.holdMinutes` (mặc định 6).
4. Lưu Booking PENDING và Payment PENDING, gắn ticket HOLDING, lưu BookingFood; broadcast trạng thái ghế sau commit.

Giới hạn `booking.maxTicketsPerTransaction` mặc định 8, lấy từ system settings và chặn tối thiểu 1. Không còn giới hạn cộng dồn vé theo phim.

`BookingTransactionEffects` dùng Lua để chỉ xóa khóa thuộc đúng booking. Khi acquire lỗi, chỉ dọn khóa đã lấy; rollback cũng dọn khóa của transaction. Release và broadcast theo các đường xử lý sử dụng after-commit để đồng bộ với DB.

### Nhân viên tại quầy

`POST /booking/staff`: ADMIN/STAFF, xác thực chi nhánh, kiểm tra ghế/Redis, giới hạn vé và tồn bắp nước. Tìm hoặc tạo khách bằng thông tin liên hệ. `staffUser` ghi nhận người bán.

CASH hoặc phương thức null: Booking COMPLETED, Payment PAID, ticket BOOKED, tạo QR và publish `BookingPaidEvent`. Phương thức khác CASH: PENDING/HOLDING, chờ xử lý thanh toán tiếp. Không có nghiệp vụ bắt buộc mở ca trước bán vé.

### VNPay

`POST /v1/vnpay/payment-url` yêu cầu booking tồn tại và còn chờ thanh toán; kiểm tra chủ đơn/người bán/ADMIN. Số tiền lấy từ Payment đã lưu, txnRef dùng booking ID. URL được ký HMAC-SHA512. Return/IPN xác minh callback và xử lý trạng thái qua `VnpayService`.

Thanh toán thành công cập nhật Booking COMPLETED, Payment PAID/VNPAY, ticket BOOKED, QR, release hold và thông báo realtime; publish sự kiện gửi vé. Thanh toán thất bại/hủy giải phóng ghế và hoàn tồn theo đường xử lý tương ứng. Khi sửa callback, giữ tính idempotent và kiểm tra số tiền/trạng thái.

`BookingTicketEmailListener.sendTicketEmail` nghe `BookingPaidEvent` bằng `@TransactionalEventListener(AFTER_COMMIT)`, đọc booking trong transaction mới rồi gọi `EmailService.sendBookingTickets`.

### Hủy, hết hạn, hoàn tiền

Hủy booking chỉ cho đơn PENDING theo quyền truy cập. `BookingCleanupJob.releaseExpiredBookings` chạy mỗi 120 giây, khóa và kiểm tra lại trạng thái/expiry, chuyển Booking/Payment sang CANCELLED, trả ticket AVAILABLE, xóa QR/check-in, hoàn tồn và giải phóng Redis sau commit.

Khách gửi yêu cầu hoàn tiền; ADMIN/MANAGER duyệt/từ chối theo chi nhánh. Chấp thuận cập nhật REFUNDED, ghi người xử lý/ghi chú/số tiền, trả ghế, điều chỉnh tổng chi tiêu và hạng thành viên. Không duyệt nếu vé đã check-in. Từ chối đưa booking về COMPLETED. Không đồng nhất thao tác duyệt nội bộ với API hoàn tiền trực tiếp của nhà cung cấp VNPay.

## Bắp nước, realtime và check-in

Tồn kho vẫn được sử dụng: `FoodStockService.reserve` trừ tồn khi tạo booking, `release` hoàn tồn khi hủy/hết hạn; stock null là không giới hạn. Có `notifyLowStock` và type LOW_STOCK. Việc không có trang tồn kho riêng không đồng nghĩa đã gỡ nghiệp vụ tồn kho.

SockJS endpoint mặc định `http://localhost:8081/api/ws`; broker `/topic`, application prefix `/app`; topic ghế `/topic/showtime/{showtimeId}/seats`. Payload `SeatStatusEvent` chứa `seatId`, `status`. `TicketService` kết hợp DB với Redis để trả `displayStatus`.

Check-in nhận mã vé, QR payload, QR lưu trong DB hoặc booking code; check-in bằng booking code xử lý các vé của đơn. Ảnh QR gửi multipart field `qrImage` đến `/ticket/check-in/qr-image`. Chỉ đơn hợp lệ đã thanh toán được check-in; ghi `checkedInAt`, `checkedInBy`, giữ thông tin lần check-in trước và trả `alreadyCheckedIn` khi quét lại.

## Vận hành và API chính

Tất cả đường dẫn sau tương đối với `http://localhost:8081/api`; controller không thêm lại `/api`.

| Nhóm | Endpoint tiêu biểu |
| --- | --- |
| Auth/user | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `/sign-up`, `/users`, `/my-info` |
| Phim | `/movie`, `/movie/now-showing`, `/movie/upcoming`, `/movie/{id}/ratings`, `/movie/{id}/rating`, `/genre`, `/director` |
| Rạp/phòng/ghế | `/branch`, `/room`, `/seat/room/{roomId}`, `PUT /seat/room/{roomId}/layout` |
| Suất chiếu/vé | `/showtime`, `/showtime/today`, `/showtime/movie/{id}`, `/showtime/branch/{id}`, `/ticket/showtime/{id}`, `/ticket/check-in` |
| Đơn hàng | `/booking`, `/booking/staff`, `/booking/my-bookings/list`, `/booking/{id}/apply-promotion` |
| Hoàn tiền | `/booking/refunds`, `/booking/{id}/refund-request`, `/booking/{id}/refund-process` |
| Bắp nước/khuyến mãi | `/food`, `/food/all`, `/promotion`, `/promotion/available`, `/promotion/validate` |
| VNPay | `/v1/vnpay/payment-url`, `/v1/vnpay/return`, `/v1/vnpay/ipn`, `/v1/vnpay/querydr`, `/v1/vnpay/refund` |
| Dashboard | `/staff/dashboard`, `/admin/analytics/dashboard` |
| Báo cáo | `/admin/operations/daily-report`, `/admin/reports/revenue`, `/admin/reports/export/revenue.xlsx`, `/admin/reports/export/operations.xlsx` |
| Hệ thống | `/notifications`, `/notifications/unread-count`, `POST /notifications/{id}/read`, `/admin/audit-logs`, `/admin/settings` |

Staff dashboard hiện tính doanh thu/đơn/vé bán của chính nhân viên trong ngày; check-in và yêu cầu hoàn tiền theo chi nhánh, kèm đơn gần đây và suất chiếu sắp tới. Không còn StaffShift, StaffSchedule, mở/chốt ca, bàn giao hay lịch trực.

`OperationsReportResponse` có `summary`, `paymentBreakdown`, `refundQueue`, `showtimeLoads`; không còn phần báo cáo ca/lịch trực/tồn kho. XLSX operations hiện xuất các chỉ số tổng hợp, không phải toàn bộ mọi danh sách trong DTO.

Notification lấy 100 bản ghi mới nhất toàn hệ thống trước khi lọc quyền; unread count cũng dựa trên tập này. `readAt` nằm trên bản ghi notification, không phải bảng trạng thái đọc riêng theo người dùng.

System settings mặc định: `booking.holdMinutes=6`, `booking.maxTicketsPerTransaction=8`, `refund.windowHours=24`, `cinema.supportEmail`, `cinema.supportHotline`.

## Migration và kiểm tra

`migrations/` có SQL cho PK `id`, tách payments, đổi cột người bán, giá chung theo suất, công nghệ phòng/định dạng chiếu, hiển thị phim, ràng buộc dữ liệu, check-in actor và gỡ giới hạn theo phim/ca/lịch trực. Đây là script chuyển đổi thủ công; không coi Hibernate update là công cụ tự di chuyển mọi dữ liệu cũ.

Khi cần dùng các script gỡ chức năng, đọc đúng thứ tự phụ thuộc: `remove_staff_handover` còn giữ STAFF_SCHEDULE, sau đó `remove_staff_scheduling` mới loại STAFF_SCHEDULE. `drop_unused_food_stock_transactions` chỉ xóa bảng lịch sử cũ; tồn hiện tại vẫn nằm ở Food. Việc cập nhật tài liệu không chạy bất kỳ migration nào.

Test hiện có trong `src/test/java/com/ltweb/backend/service/` bao phủ thanh toán/persistence, refund, transaction effects, giới hạn vé, staff dashboard, tồn bắp nước, giá suất chiếu, layout ghế, mapping check-in và ràng buộc schema. Chọn test theo thay đổi, chạy `mvn test` khi cần kiểm tra toàn bộ. Không sửa mã MapStruct sinh ra trong `target/`.

Trước sửa symbol, chạy GitNexus impact với repo `TTCS_N9_D23CN`; trước commit chạy detect_changes. Index quan sát được tạo 2026-11-11; lần cập nhật này đối chiếu trực tiếp source working tree cho các chức năng đang thay đổi.
