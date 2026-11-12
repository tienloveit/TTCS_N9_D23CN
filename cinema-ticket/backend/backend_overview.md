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

MySQL/Redis phải sẵn sàng cho runtime. Các runner `ApplicationInitConfig` và `DataSeeder` mặc định tắt: chỉ đăng ký khi có profile `dev`, không có `prod`, và `app.demo.seed-enabled=true` (biến môi trường `APP_DEMO_SEED_ENABLED=true`). Chỉ bật trên database demo riêng: seed cập nhật dữ liệu mẫu và có thể xóa lịch sử đặt vé/suất chiếu cũ hơn 30 ngày. Gỡ biến sau khi dùng. `seed-data.ps1` có bước cleanup/reset dữ liệu riêng, không phải lệnh chạy ứng dụng thông thường.

API cleanup mặc định không được đăng ký. Chỉ bật khi profile `dev` đang hoạt động, không có profile `prod`, và `app.maintenance.cleanup-enabled=true`; vẫn bắt buộc quyền ADMIN. Để dùng script reset demo, khởi động backend trong môi trường phát triển với:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:APP_MAINTENANCE_CLEANUP_ENABLED = "true"
mvn spring-boot:run
```

`seed-data.ps1` đăng nhập admin trước cleanup và đăng nhập lại sau khi reset. Khi dừng dùng chế độ reset, gỡ biến `APP_MAINTENANCE_CLEANUP_ENABLED` khỏi môi trường chạy.

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

JWT HS512; access token 30 phút (`token_use=access`), refresh token 30 ngày (`token_use=refresh`). Hai loại token không dùng thay nhau. Xác minh thuật toán, chữ ký và claim bắt buộc (`sub`, `jti`, `iat`, `exp`, `role`, `token_use`) trước khi truy cập Redis; token lỗi trả lỗi xác thực có kiểm soát.

- Refresh đang hoạt động lưu ở `auth:refresh:active:{jti}`, giá trị là username, TTL đến thời điểm token hết hạn. Refresh dùng Lua compare-and-delete nguyên tử, chỉ một request dùng được token cũ, rồi cấp/lưu cặp mới. Tài khoản BLOCKED/INACTIVE không được cấp token mới qua refresh.
- Logout blacklist access token ở `auth:access:revoked:{jti}` đến khi hết hạn. Access token bị thu hồi không thể dùng để refresh. Logout hiện thu hồi access token được gửi lên, không thu hồi mọi refresh session của tài khoản.
- `RedisToken`/`RedisTokenRepository` là mô hình cũ, không còn được luồng auth mới sử dụng. Không cần xóa dữ liệu Redis cũ để cập nhật; token thiếu `token_use` bị từ chối, người dùng cần đăng nhập lại sau triển khai.
- Role claim được chuyển thành `ROLE_*`; quyền chi nhánh/chủ sở hữu còn được kiểm tra trong service. Frontend gộp các request 401 đồng thời vào một lần refresh và dùng lại access token mới cho phản hồi 401 đến muộn.

OTP dùng SecureRandom tạo chuỗi 6 chữ số, TTL 5 phút, key `otp:code:{email}`. Bộ đếm `otp:limit:{email}` từ chối khi vượt 5 lần; TTL bộ đếm được đặt lại 1 phút sau mỗi lần increment.

`SecurityConfig` cho public các endpoint đăng ký/đăng nhập/refresh/quên mật khẩu, OAuth2, callback VNPay, WebSocket và một số GET danh mục. Cleanup yêu cầu ADMIN và điều kiện môi trường ở trên. GET public ở filter vẫn có thể bị chặn bởi method security. Các route khác yêu cầu auth; đọc cả controller lẫn service để xác định quyền đầy đủ.

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

`POST /v1/vnpay/querydr` và `/v1/vnpay/refund` yêu cầu ADMIN hoặc MANAGER ở filter và method security. Service kiểm tra lại tài khoản còn hoạt động, role và chi nhánh hiện tại trong DB; MANAGER chỉ được thao tác đơn thuộc chi nhánh được phân công. Callback return/IPN vẫn public để VNPay gọi.

Hai API quản lý nhận `orderId` để tìm đơn, rồi dùng booking ID chuẩn và thời gian giao dịch lưu trong Payment. Hoàn tiền trực tiếp chỉ cho đơn VNPAY/PAID đang REFUND_REQUESTED, chưa check-in và có mã giao dịch nhà cung cấp; số tiền, người thực hiện và loại hoàn toàn phần lấy từ server. DTO cũ vẫn được nhận để tương thích: `amount` phải khớp số tiền đã lưu và `trantype` phải là `02`; yêu cầu hoàn một phần hoặc sai số tiền bị từ chối. `user`/`transDate` từ client không quyết định payload gửi cổng thanh toán.

URL thanh toán mới dùng `Payment.paymentCreatedAt` làm `vnp_CreateDate`, để các lệnh quản lý tái sử dụng đúng thời gian này. Với URL/đơn phát sinh trước bản sửa, cần đối chiếu timestamp giao dịch gốc khi thực hiện truy vấn/hoàn tiền, vì trước đây URL có thể dùng thời gian khác giá trị đã lưu.

Thanh toán thành công cập nhật Booking COMPLETED, Payment PAID/VNPAY, ticket BOOKED, QR, release hold và thông báo realtime; publish sự kiện gửi vé. Thanh toán thất bại/hủy giải phóng ghế và hoàn tồn theo đường xử lý tương ứng. Khi sửa callback, giữ tính idempotent và kiểm tra số tiền/trạng thái.

`BookingTicketEmailListener.sendTicketEmail` nghe `BookingPaidEvent` bằng `@TransactionalEventListener(AFTER_COMMIT)`, đọc booking trong transaction mới rồi gọi `EmailService.sendBookingTickets`.

### Hủy, hết hạn, hoàn tiền

Hủy booking chỉ cho đơn PENDING theo quyền truy cập. `BookingCleanupJob.releaseExpiredBookings` chạy mỗi 120 giây, khóa và kiểm tra lại trạng thái/expiry, chuyển Booking/Payment sang CANCELLED, trả ticket AVAILABLE, xóa QR/check-in, hoàn tồn và giải phóng Redis sau commit.

Khách gửi yêu cầu hoàn tiền; ADMIN/MANAGER duyệt/từ chối theo chi nhánh. `BookingService.processRefund` và API VNPay refund cùng đi qua `BookingRefundService`. Với VNPAY, service khóa booking và commit mã lần thử/trạng thái PROCESSING vào Payment trước khi gọi mạng; không giữ transaction DB trong lúc chờ VNPay. Chỉ phản hồi có chữ ký hợp lệ, đúng merchant/đơn/số tiền, loại hoàn toàn phần `02`, response code `00`, transaction status `00` và mã giao dịch mới cho phép hoàn tất. `VnpayRefundGateway` kiểm tra chữ ký theo đặc tả [querydr/refund VNPay](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html); HTTP thành công hoặc response code `00` riêng lẻ chưa đủ.

Payment lưu `refundRequestId`, `refundGatewayStatus`, `refundRequestedAt`, `refundGatewayCode`, `refundGatewayMessage`. Timeout, phản hồi không xác thực, mã trùng/chưa rõ kết quả hoặc trạng thái đang xử lý giữ UNKNOWN; booking vẫn REFUND_REQUESTED và payment vẫn PAID. Bấm duyệt lại ở UNKNOWN chỉ query kết quả, không gửi thêm lệnh refund. PROCESSING trong 60 giây trả trạng thái đang chờ; quá thời gian đó cũng query để phục hồi sau crash. Kết quả query chỉ nói về thanh toán gốc (type `01`) không được xem là xác nhận hoàn tiền; nếu cổng không cung cấp xác nhận refund thì tiếp tục chờ và cần đối soát với VNPay, không tự sửa marker để gửi lại. Chỉ từ chối rõ ràng, có xác thực, mới đặt FAILED để cho phép thử mới. HTTP connect timeout 5 giây, read timeout 15 giây.

Mỗi transaction của coordinator xóa cache JPA của request trước khi đọc lại dưới khóa, tránh dùng entity cũ khi Open EntityManager in View đang bật. Khi phản hồi tới muộn, service kiểm tra lại mã lần thử và trạng thái cuối cùng; kết quả của lần thử cũ không được ghi đè lần mới.

Sau xác nhận thành công, transaction mới chuyển Booking/Payment sang REFUNDED, ghi số tiền/ngày hoàn, trả ghế, điều chỉnh tổng chi tiêu và hạng thành viên; thông báo ghế chạy sau commit. Duyệt lặp khi đã REFUNDED không hoàn lại lần nữa. Người xử lý/ghi chú được lưu từ lúc gửi yêu cầu; không đồng nghĩa đã hoàn tiền. Không duyệt nếu vé đã check-in. CASH vẫn được xác nhận hoàn thủ công tại quầy; các phương thức khác chưa được hỗ trợ tự động. Từ chối đưa booking về COMPLETED nhưng bị chặn khi lần thử còn PROCESSING/UNKNOWN. Hoàn tiền không tự coi bắp nước đã được trả vật lý.

UI quản lý đọc trạng thái thực tế: chỉ báo thành công khi REFUNDED; nếu chưa xác nhận thì giữ đơn chờ và hiển thị “Kiểm tra kết quả”. API `/v1/vnpay/refund` trả tên trạng thái booking trong `result`, thay cho phản hồi thô từ cổng.

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

Các API đọc đơn của khách trả `refundDeadline` theo `refund.windowHours` hiện tại, tính từ `payment.paidAt`; chỉ có giá trị cho đơn COMPLETED đã thanh toán và chưa check-in. Frontend dùng thời hạn này thay vì tự cộng cố định 24 giờ. Cập nhật hồ sơ cá nhân dùng `UpdateProfileRequest` chỉ cho phép `fullName`, `dob`, `phoneNumber`, `gender`, `email`; không thay đổi quyền, chi nhánh hay trạng thái tài khoản.

## Migration và kiểm tra

`migrations/` có SQL cho PK `id`, tách payments, đổi cột người bán, giá chung theo suất, công nghệ phòng/định dạng chiếu, hiển thị phim, ràng buộc dữ liệu, check-in actor và gỡ giới hạn theo phim/ca/lịch trực. Đây là script chuyển đổi thủ công; không coi Hibernate update là công cụ tự di chuyển mọi dữ liệu cũ.

`migrations/20261112_refund_gateway_attempt.sql` bổ sung 5 cột nullable vào `payments` trên MySQL 8, chạy được lại; áp dụng trước khi deploy với `ddl-auto=validate`. Không có cơ chế tự chạy migration này. Script không sửa lịch sử: đơn REFUNDED từ phiên bản cũ có marker null không phải bằng chứng VNPay đã hoàn tiền, cần đối soát riêng, không gửi lại hàng loạt. Lần sửa này chưa chạy SQL trên DB thật.

Khi cần dùng các script gỡ chức năng, đọc đúng thứ tự phụ thuộc: `remove_staff_handover` còn giữ STAFF_SCHEDULE, sau đó `remove_staff_scheduling` mới loại STAFF_SCHEDULE. `drop_unused_food_stock_transactions` chỉ xóa bảng lịch sử cũ; tồn hiện tại vẫn nằm ở Food. Việc cập nhật tài liệu không chạy bất kỳ migration nào.

Test hiện có trong `src/test/java/com/ltweb/backend/service/` bao phủ thanh toán/persistence, refund, transaction effects, giới hạn vé, staff dashboard, tồn bắp nước, giá suất chiếu, layout ghế, mapping check-in và ràng buộc schema. `JwtSecurityTest` kiểm tra phân loại token, logout, refresh/replay/đồng thời, tài khoản bị khóa, chữ ký sai và claim thiếu/lỗi; Redis được giả lập trong test này. Chạy riêng bằng `mvn -Dtest=JwtSecurityTest test`, hoặc chạy toàn bộ bằng `mvn test`. Không sửa mã MapStruct sinh ra trong `target/`.

`BookingRefundFlowTest` kiểm tra commit trước gọi cổng, timeout/query lại, chống gửi trùng khi đồng thời, lỗi commit và CASH. Transaction/concurrency được giả lập trong unit test; không thay thế kiểm thử MySQL. `VnpayRefundGatewayTest` kiểm tra chữ ký, đối chiếu giao dịch, pending/rejection và phản hồi không rõ kết quả bằng HTTP mock; `RefundDecisionResponseTest` kiểm tra cả hai route không báo thành công sớm. Chưa chạy giao dịch hoàn tiền thật/sandbox. Test persistence cần DB riêng qua `PAYMENT_TEST_DATABASE`; bị skip nếu chưa cấu hình.

Trước sửa symbol, chạy GitNexus impact với repo `TTCS_N9_D23CN`; trước commit chạy detect_changes. Khi index cũ, phân tích lại working tree trước khi tin kết quả.
