# MoviePTIT — Backend Context

Đối chiếu mã nguồn ngày **2026-11-20** (commit `685f713` cùng thay đổi `JwtAuthenticationFilter`/`SecurityConfig` chưa commit). Xem [context toàn dự án](../CLAUDE.md), [context frontend](../frontend/CLAUDE.md) và [hướng dẫn AI cho backend](AGENTS.md).

## Runtime và cấu hình

Java **21**, Spring Boot **3.4.0**, Maven; Spring Web, Security/OAuth2 Resource Server, Data JPA/JDBC, Redis, WebSocket/STOMP, Mail, MapStruct, Lombok, ZXing. Cấu hình nằm tại `src/main/resources/application.yaml`.

| Thành phần | Mặc định |
| --- | --- |
| API | `http://localhost:8081/api` (`server.port: 8081`, context path `/api`) |
| MySQL | `jdbc:mysql://localhost:3306/cinema`, user `root` |
| Redis | `localhost:6379` |
| Schema | Flyway (`db/migration`, baseline V1 cho database có sẵn); JPA `ddl-auto: validate`, bật SQL log |
| Cache | `spring.cache.type: redis`. `TicketService` cố ý không cache trạng thái ghế vì cần đọc khóa Redis theo thời gian thực |
| Email | Gmail SMTP, cổng 587, STARTTLS |
| OAuth2 | Google; redirect frontend `/oauth2/callback` |
| VNPay | Sandbox; frontend return `/payment/vnpay-return` |
| Upload | File tối đa 5MB, request tối đa 6MB |

Biến môi trường bắt buộc theo YAML: `SPRING_DATASOURCE_PASSWORD`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `JWT_SECRET_KEY`, `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY`. Google login cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; redirect có thể đổi bằng `APP_OAUTH2_SUCCESS_URL`, `APP_OAUTH2_FAILURE_URL`. YAML import các `.env` tùy chọn. Không đưa giá trị bí mật vào tài liệu.

Từ thư mục `backend`:

```powershell
.\mvnw.cmd spring-boot:run
.\mvnw.cmd -q -DskipTests compile
.\mvnw.cmd test
.\mvnw.cmd spotless:apply
.\mvnw.cmd spotless:check
.\mvnw.cmd -q -DskipTests package
```

MySQL/Redis phải sẵn sàng cho runtime. Các runner `ApplicationInitConfig` và `DataSeeder` mặc định tắt: chỉ đăng ký khi có profile `dev`, không có `prod`, và `app.demo.seed-enabled=true` (biến môi trường `APP_DEMO_SEED_ENABLED=true`). Chỉ bật trên database demo riêng: seed cập nhật dữ liệu mẫu và có thể xóa lịch sử đặt vé/suất chiếu cũ hơn 30 ngày. Gỡ biến sau khi dùng. `seed-data.ps1` có bước cleanup/reset dữ liệu riêng, không phải lệnh chạy ứng dụng thông thường.

API cleanup mặc định không được đăng ký. Chỉ bật khi profile `dev` đang hoạt động, không có profile `prod`, và `app.maintenance.cleanup-enabled=true`; vẫn bắt buộc quyền ADMIN. Để dùng script reset demo, khởi động backend trong môi trường phát triển với:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:APP_MAINTENANCE_CLEANUP_ENABLED = "true"
.\mvnw.cmd spring-boot:run
```

`seed-data.ps1` đăng nhập admin trước cleanup và đăng nhập lại sau khi reset. Khi dừng dùng chế độ reset, gỡ biến `APP_MAINTENANCE_CLEANUP_ENABLED` khỏi môi trường chạy.

## Kiến trúc và nơi đọc code

`controller` nhận request → `service` kiểm tra quyền, nghiệp vụ và transaction → `repository` truy cập entity → `mapper` tạo DTO. `config` chứa Security/JWT/Redis/WebSocket/VNPay/OAuth2; `exception` chứa `AppException`, `ErrorCode`, handler; `event` chứa sự kiện thanh toán; `job` dọn đơn hết hạn.

`BookingService` giữ API service hiện tại và điều phối 5 dependency: `BookingCheckoutService` tạo đơn online/tại quầy; `BookingCommandService` cập nhật, hủy, áp mã và yêu cầu hoàn; `BookingQueryService` đọc đơn (danh sách quản lý lọc chi nhánh/trạng thái ngay trong truy vấn `findByBranchId`, `findByStatusIn`, `findByBranchIdAndStatusIn`; vẫn trả toàn bộ danh sách vì frontend tự phân trang và xuất XLSX); `BookingMembershipService` cập nhật chi tiêu/hạng; `BookingRefundService` duyệt và đối soát hoàn tiền. `BookingPricingService` tính giá vé, đồ ăn, khuyến mãi dùng chung; `StaffCustomerService` tìm/tạo khách tại quầy; `BookingReleaseService` trả ghế, tồn bắp nước và lượt khuyến mãi. Khóa vé/booking và thao tác reserve stock vẫn nằm trong transaction của use case.

`CurrentUserProvider` phân biệt người dùng bắt buộc với truy cập tùy chọn, không cache tài khoản giữa các request. `BookingAccessPolicy` giữ các quy tắc xem, quản lý, hủy, bán tại quầy và duyệt hoàn riêng biệt; quyền MANAGER không tự động bao gồm quyền hủy đơn. `RefundPolicy` dùng chung điều kiện thanh toán/chưa check-in và deadline; lúc duyệt không áp lại cửa sổ gửi yêu cầu của khách. `PasswordRecoveryService` xử lý đổi/quên/reset mật khẩu; `AuthService` tiếp tục điều phối đăng nhập, refresh và Google login.

`TimeConfig` cung cấp một `Clock` theo `Asia/Ho_Chi_Minh` cho các nghiệp vụ runtime (booking/payment/refund/check-in, cleanup, JWT, promotion, showtime, notification và báo cáo). Khi test thời điểm hết hạn, inject `Clock.fixed` thay vì chờ thời gian thực.

Spotless dùng Google Java Format và xóa import thừa; `check` chạy ở phase `validate`. Baseline `bf27d26c04b17780279ead08e392de319651e475` cho phép áp dụng dần cho file thay đổi từ đợt refactor, tránh định dạng lại toàn bộ lịch sử. Checkout cần có commit baseline này. Chạy `mvn spotless:apply` trước khi build nếu formatter báo lỗi.

Mặc định build vẫn ghi vào `target`. Nếu IDE đang tự compile vào thư mục này, có thể tách output kiểm thử để tránh trộn class:

```powershell
.\mvnw.cmd "-Dbackend.build.directory=target/verification" test
```

Test booking dùng `BackendServiceFixtures` để dựng service thật qua constructor, chỉ giả lập repository/gateway và các I/O liên quan. `BackendPoliciesTest`, `BookingPricingServiceTest`, `ClockedJwtServiceTest`, `PasswordRecoveryServiceTest` và `BookingServiceWiringTest` kiểm tra các ranh giới được tách ở trên.

Lỗi ràng buộc dữ liệu không trả chi tiết SQL cho client: MySQL 1451 (dữ liệu còn được tham chiếu, ví dụ xóa chi nhánh còn nhân viên) trả `RESOURCE_IN_USE` 409 với gợi ý ngừng hoạt động thay vì xóa; 1062 (trùng giá trị unique) trả `DUPLICATE_VALUE` 409; còn lại trả `DATA_INTEGRITY_VIOLATION`. Chi tiết chỉ ghi log server.

Response thành công thường bọc `ApiResponse<T>` với `code`, `message`, `result`; lỗi dùng `ErrorResponse` qua `GlobalExceptionHandler`. Xuất XLSX trả trực tiếp `ResponseEntity<byte[]>`. Đọc DTO/mapper để xác định hợp đồng JSON thay vì dùng tên field entity.

## Danh mục, lịch chiếu và media

- `MovieService` quản lý phim, thể loại/đạo diễn và đánh giá. Danh sách công khai lọc `isPublic`, mỗi người dùng có tối đa một đánh giá trên mỗi phim. `MovieMediaController` nhận multipart field `file` tại `POST /movie/media` cho ADMIN, lưu JPG/PNG/WebP đến 5 MB trong `app.movie-media-directory` (mặc định `uploads/movies` tính từ thư mục chạy) và trả đường dẫn cho `GET /movie/media/{filename}`.
- `BranchService`, `RoomService` và `SeatService` quản lý cấu trúc rạp, trạng thái phòng và layout. `ShowtimeService` kiểm tra phòng, giờ bắt đầu/kết thúc và khoảng đệm 15 phút giữa các suất cùng phòng. Khi tạo suất, `TicketService.createTicket` tạo một vé cho mỗi ghế. Đổi giá suất chỉ cập nhật ticket khi tất cả vé còn AVAILABLE và chưa gắn booking. Job đóng suất hết giờ chạy mỗi 5 phút.
- `FoodService` cung cấp danh mục bắp nước, `FoodStockService` quản lý reserve/release. `PromotionService` xác nhận phạm vi và điều kiện sử dụng ở backend. `POST /promotion/validate` kiểm tra mã, còn `PATCH /booking/{id}/apply-promotion` lưu giá và khuyến mãi cho đơn chờ thanh toán.

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

`JwtAuthenticationFilter` (trong `config`) đọc Bearer token bằng `DefaultBearerTokenResolver`, chuyển cho `JwtAuthenticationProvider` dùng `JwtDecoderConfig` và `jwtAuthenticationConverter` để xác minh, rồi lưu kết quả vào `SecurityContext` của request qua `RequestAttributeSecurityContextRepository` (không dùng session). `SecurityConfig` đăng ký filter bằng `addFilterAt(..., BearerTokenAuthenticationFilter.class)` thay cho cấu hình `oauth2ResourceServer`, nên chuỗi filter không còn `BearerTokenAuthenticationFilter`. Khi request thiếu Bearer token, filter chuyển tiếp để các quy tắc truy cập quyết định; nhờ vậy route public và luồng Google OAuth2 (`/oauth2/authorization/google`, `/login/oauth2/code/google`) vẫn chạy bình thường. Header Bearer sai định dạng, refresh token dùng làm access token hoặc token không hợp lệ trả JSON `401` (`code: 401`) qua `JwtAuthenticationEntryPoint`. Request đã xác thực JWT nhưng thiếu role nhận `403` từ `BearerTokenAccessDeniedHandler`, kèm header `WWW-Authenticate`.

- Refresh đang hoạt động lưu ở `auth:refresh:active:{jti}`, giá trị là username, TTL đến thời điểm token hết hạn. Refresh dùng Lua compare-and-delete nguyên tử, chỉ một request dùng được token cũ, rồi cấp/lưu cặp mới. Tài khoản BLOCKED/INACTIVE không được cấp token mới qua refresh.
- Logout blacklist access token ở `auth:access:revoked:{jti}` đến khi hết hạn. Access token bị thu hồi không thể dùng để refresh. Logout hiện thu hồi access token được gửi lên, không thu hồi mọi refresh session của tài khoản.
- `RedisToken`/`RedisTokenRepository` là mô hình cũ, không còn được luồng auth mới sử dụng. Không cần xóa dữ liệu Redis cũ để cập nhật; token thiếu `token_use` bị từ chối, người dùng cần đăng nhập lại sau triển khai.
- Role claim được chuyển thành `ROLE_*`; quyền chi nhánh/chủ sở hữu còn được kiểm tra trong service. Frontend gộp các request 401 đồng thời vào một lần refresh và dùng lại access token mới cho phản hồi 401 đến muộn.

OTP dùng SecureRandom tạo chuỗi 6 chữ số, TTL 5 phút, key `otp:code:{email}`. Bộ đếm `otp:limit:{email}` từ chối khi vượt 5 lần; TTL bộ đếm được đặt lại 1 phút sau mỗi lần increment.

`SecurityConfig` cho public `/sign-up`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/oauth2/**`, `/login/oauth2/**`, `/v1/vnpay/return`, `/v1/vnpay/ipn`, `/ws/**` và GET dưới `/movie`, `/showtime`, `/ticket/showtime`, `/genre`, `/director`, `/food`, `/branch`, `/room`. Cleanup yêu cầu ADMIN và điều kiện môi trường ở trên. Route public ở filter vẫn có thể bị chặn bởi method security, ví dụ `GET /showtime/today` (ADMIN/STAFF), `GET /room/**`, `GET /food/all`, `GET /branch/{id}` (ADMIN/MANAGER) và `POST /user` (ADMIN/MANAGER). Các route khác yêu cầu auth; đọc cả controller lẫn service để xác định quyền đầy đủ.

- ADMIN có phạm vi toàn hệ thống; MANAGER/STAFF chịu kiểm tra chi nhánh trong các nghiệp vụ tương ứng.
- Bán vé tại quầy và staff dashboard: ADMIN/STAFF.
- Check-in: ADMIN/STAFF/MANAGER; manager/staff trong chi nhánh được phân công.
- Quản lý hoàn tiền và báo cáo: ADMIN/MANAGER, có kiểm tra phạm vi chi nhánh.
- System settings: ADMIN.
- Thông báo: mọi tài khoản đăng nhập, lọc theo người nhận/role/chi nhánh.

CORS REST cho localhost và 127.0.0.1 ở cổng 5173/5174/3000. Danh sách method là GET/POST/PUT/PATCH/DELETE/OPTIONS. `PromotionCorsTest` kiểm tra preflight PATCH cho API áp mã khuyến mãi. `WebSocketConfig` có cấu hình origin riêng cho SockJS: endpoint `/ws` hiện nhận mọi origin qua `setAllowedOriginPatterns("*")`.

## Đặt vé và transaction

### Khách đặt online

1. `POST /booking` → `BookingService.createBooking`: lấy user, kiểm tra giới hạn vé/giao dịch, suất chiếu hợp lệ (online chỉ bán trước giờ chiếu), giới hạn đơn chờ thanh toán và seatIds không trùng.
2. Lấy ticket bằng truy vấn khóa `findSeatsForUpdate`; tất cả phải AVAILABLE. Kiểm tra bắp nước/chi nhánh, reserve tồn, tính giá và khuyến mãi phía server, rồi giữ một lượt khuyến mãi bằng `PromotionService.reserveUsage`.
3. `BookingTransactionEffects.acquire` tạo Redis key `seat_hold:{showtimeId}:{seatId}`, giá trị là booking code, TTL theo `booking.holdMinutes` (mặc định 6).
4. Lưu Booking PENDING và Payment PENDING, gắn ticket HOLDING, lưu BookingFood; broadcast trạng thái ghế sau commit.

Giới hạn `booking.maxTicketsPerTransaction` mặc định 8, lấy từ system settings và chặn tối thiểu 1. Không còn giới hạn cộng dồn vé theo phim. `booking.maxPendingPerUser` (mặc định 2) giới hạn số đơn PENDING còn hạn của một khách; vượt mức trả `BOOKING_PENDING_LIMIT`, để một tài khoản không giữ hết ghế của suất. Mỗi món bắp nước tối đa 50 phần một đơn (`CreateBookingFoodRequest.MAX_QUANTITY`, frontend dùng `MAX_FOOD_QUANTITY`).

Mã đơn có dạng `BK-YYYYMMDD-XXXXXXXX`, 8 ký tự Crockford base32 sinh từ `SecureRandom`, sinh lại khi trùng (`existsByBookingCode`). Mã dùng được để check-in nên không được dễ đoán.

`BookingTransactionEffects` dùng Lua để chỉ xóa khóa thuộc đúng booking. Khi acquire lỗi, chỉ dọn khóa đã lấy; rollback cũng dọn khóa của transaction. Release và broadcast theo các đường xử lý sử dụng after-commit để đồng bộ với DB.

### Nhân viên tại quầy

`POST /booking/staff`: ADMIN/STAFF, xác thực chi nhánh, kiểm tra ghế/Redis, giới hạn vé và tồn bắp nước. `StaffCustomerService` chuẩn hóa SĐT (10 số, bắt đầu bằng 0, nhận `+84`) và email rồi tìm hoặc tạo khách. Nếu SĐT/email trùng tài khoản có sẵn, request phải gửi `confirmedCustomerId` đúng ID trả về từ `GET /staff/customers/lookup` (thông tin đã che bớt), nếu không thì trả `CUSTOMER_CONFIRMATION_REQUIRED`. Chỉ gắn đơn vào tài khoản USER còn ACTIVE (`CUSTOMER_NOT_ELIGIBLE`). Email và SĐT thuộc hai tài khoản khác nhau trả `CUSTOMER_CONTACT_CONFLICT`. Mục đích là tránh gắn đơn, chi tiêu và email vé có QR vào tài khoản người khác. `staffUser` ghi nhận người bán, `BookingResponse.staffUserId/staffUsername` cho biết đơn bán tại quầy. Quầy được bán tới `BookingCheckoutService.STAFF_SALE_GRACE_MINUTES` (15) phút sau giờ chiếu, khớp với `isShowtimeAvailable` trong màn bán vé; khi đổi phải sửa cả hai nơi.

CASH hoặc phương thức null: Booking COMPLETED, Payment PAID, ticket BOOKED, tạo QR và publish `BookingPaidEvent`, không lấy khóa Redis. Phương thức khác CASH: PENDING/HOLDING và giữ ghế ở Redis như đơn online, chờ xử lý thanh toán tiếp. Không có nghiệp vụ bắt buộc mở ca trước bán vé.

### VNPay

`POST /v1/vnpay/payment-url` yêu cầu booking tồn tại và còn chờ thanh toán; kiểm tra chủ đơn/người bán/ADMIN. Số tiền lấy từ Payment đã lưu, txnRef dùng booking ID. URL được ký HMAC-SHA512. Return/IPN xác minh callback và xử lý trạng thái qua `VnpayService`.

`POST /v1/vnpay/querydr` và `/v1/vnpay/refund` yêu cầu ADMIN hoặc MANAGER ở filter và method security. Service kiểm tra lại tài khoản còn hoạt động, role và chi nhánh hiện tại trong DB; MANAGER chỉ được thao tác đơn thuộc chi nhánh được phân công. Callback return/IPN vẫn public để VNPay gọi.

Hai API quản lý nhận `orderId` để tìm đơn, rồi dùng booking ID chuẩn và thời gian giao dịch lưu trong Payment. Hoàn tiền trực tiếp chỉ cho đơn VNPAY/PAID đang REFUND_REQUESTED, chưa check-in và có mã giao dịch nhà cung cấp; số tiền, người thực hiện và loại hoàn toàn phần lấy từ server. DTO cũ vẫn được nhận để tương thích: `amount` phải khớp số tiền đã lưu và `trantype` phải là `02`; yêu cầu hoàn một phần hoặc sai số tiền bị từ chối. `user`/`transDate` từ client không quyết định payload gửi cổng thanh toán.

URL thanh toán mới dùng `Payment.paymentCreatedAt` làm `vnp_CreateDate`, để các lệnh quản lý tái sử dụng đúng thời gian này. Với URL/đơn phát sinh trước bản sửa, cần đối chiếu timestamp giao dịch gốc khi thực hiện truy vấn/hoàn tiền, vì trước đây URL có thể dùng thời gian khác giá trị đã lưu.

Thanh toán thành công cập nhật Booking COMPLETED, Payment PAID/VNPAY, ticket BOOKED, QR, release hold và thông báo realtime; publish sự kiện gửi vé. Callback thành công vẫn xuất vé khi đã quá `expiresAt` nếu đơn còn PENDING và ghế còn giữ cho đơn (IPN có thể tới sau hạn). Nếu đơn đã hủy/hết hạn hoặc mất ghế, tiền đã bị trừ nên `recordLatePayment` ghi `providerTxnId`, đặt Payment PAID, Booking REFUND_REQUESTED, `spendingRecorded = false`, lý do `LATE_PAYMENT_REFUND_REASON`, báo quản lý qua thông báo REFUND_REQUEST và trả `00` cho VNPay; đơn này đi qua luồng duyệt hoàn tiền thường. Đơn REFUNDED/REFUND_REQUESTED/COMPLETED với payment chưa PAID không bị ghi đè. Thanh toán thất bại khi đơn còn hạn thì hủy và gọi `BookingReleaseService.releaseUnpaid`; thất bại sau hạn để job dọn dẹp xử lý. Khi sửa callback, giữ tính idempotent (payment PAID trả `02`) và kiểm tra số tiền/trạng thái. Mọi callback (cả sai chữ ký) và mọi lần gửi/truy vấn hoàn tiền được `PaymentEventService` ghi vào `payment_events` trong cùng transaction với thay đổi của đơn (không dùng REQUIRES_NEW vì dòng booking đang bị khóa); tra lịch sử một đơn bằng `PaymentEventRepository.findByBookingIdOrderByCreatedAtAscIdAsc`.

`BookingTicketEmailListener.sendTicketEmail` nghe `BookingPaidEvent` bằng `@TransactionalEventListener(AFTER_COMMIT)`, đọc booking trong transaction mới rồi gọi `EmailService.sendBookingTickets`. `MembershipUpdateListener` cũng xử lý sự kiện sau commit để cập nhật tổng chi tiêu và hạng thành viên. `BookingMembershipService` khóa dòng user (`findByIdForUpdate`), chạy một lần cho mỗi đơn nhờ `Booking.spendingRecorded`, và chỉ cộng lượt khuyến mãi cho đơn cũ chưa giữ lượt (`promotionUsageReserved` khác TRUE).

### Lượt khuyến mãi

Lượt được giữ ngay khi tạo đơn hoặc áp mã bằng một câu UPDATE có điều kiện (`PromotionRepository.reserveUsage`), nên đơn đồng thời không vượt `usageLimit`. `Booking.promotionUsageReserved = TRUE` đánh dấu lượt đang giữ. Hủy, hết hạn, VNPay thất bại và thanh toán trễ trả lượt qua `BookingReleaseService.releasePromotionUsage` (không làm `usedCount` âm). Đổi mã ở `applyPromotion` trả lượt cũ rồi giữ lượt mới trong cùng transaction. Sau thanh toán, lượt giữ trở thành lượt đã dùng và không được trả khi hoàn tiền. Đơn cũ có cờ NULL vẫn tính lượt lúc thanh toán như trước.

### Hủy, hết hạn, hoàn tiền

Hủy booking chỉ cho đơn PENDING theo quyền truy cập. `BookingCleanupJob.releaseExpiredBookings` chạy mỗi 120 giây; mỗi đơn chạy trong transaction `REQUIRES_NEW` riêng nên một đơn lỗi chỉ được ghi log và không chặn các đơn khác. Job khóa và kiểm tra lại trạng thái/expiry, chuyển Booking/Payment sang CANCELLED rồi gọi `releaseUnpaid`.

`BookingReleaseService` là nơi duy nhất trả tài nguyên của đơn: `releaseSeats` (ticket AVAILABLE, xóa QR/check-in, broadcast và nhả Redis sau commit), `releaseUnpaid` (thêm hoàn tồn bắp nước và trả lượt khuyến mãi) và `releasePromotionUsage`. Hủy đơn, job hết hạn, VNPay thất bại/thanh toán trễ dùng `releaseUnpaid`; hoàn tiền chỉ dùng `releaseSeats`.

Khách gửi yêu cầu hoàn tiền; ADMIN/MANAGER duyệt/từ chối theo chi nhánh. Với đơn bán tại quầy (`staffUser` khác null), ADMIN hoặc STAFF/MANAGER đúng chi nhánh được gửi thay khách vì khách vãng lai không đăng nhập được. Khi gửi thay phải có lý do (`REFUND_REASON_REQUIRED`), vẫn theo cùng thời hạn và điều kiện chưa check-in, và được ghi nhật ký `REFUND_REQUESTED`. `BookingService.processRefund` và API VNPay refund cùng đi qua `BookingRefundService`. Với VNPAY, service khóa booking và commit mã lần thử/trạng thái PROCESSING vào Payment trước khi gọi mạng; không giữ transaction DB trong lúc chờ VNPay. Chỉ phản hồi có chữ ký hợp lệ, đúng merchant/đơn/số tiền, loại hoàn toàn phần `02`, response code `00`, transaction status `00` và mã giao dịch mới cho phép hoàn tất. `VnpayRefundGateway` kiểm tra chữ ký theo đặc tả [querydr/refund VNPay](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html); HTTP thành công hoặc response code `00` riêng lẻ chưa đủ.

Payment lưu `refundRequestId`, `refundGatewayStatus`, `refundRequestedAt`, `refundGatewayCode`, `refundGatewayMessage`. Timeout, phản hồi không xác thực, mã trùng/chưa rõ kết quả hoặc trạng thái đang xử lý giữ UNKNOWN; booking vẫn REFUND_REQUESTED và payment vẫn PAID. Bấm duyệt lại ở UNKNOWN chỉ query kết quả, không gửi thêm lệnh refund. PROCESSING trong 60 giây trả trạng thái đang chờ; quá thời gian đó cũng query để phục hồi sau crash. Kết quả query chỉ nói về thanh toán gốc (type `01`) không được xem là xác nhận hoàn tiền; nếu cổng không cung cấp xác nhận refund thì tiếp tục chờ và cần đối soát với VNPay, không tự sửa marker để gửi lại. Chỉ từ chối rõ ràng, có xác thực, mới đặt FAILED để cho phép thử mới. HTTP connect timeout 5 giây, read timeout 15 giây.

Mỗi transaction của coordinator xóa cache JPA của request trước khi đọc lại dưới khóa, tránh dùng entity cũ khi Open EntityManager in View đang bật. Khi phản hồi tới muộn, service kiểm tra lại mã lần thử và trạng thái cuối cùng; kết quả của lần thử cũ không được ghi đè lần mới.

Sau xác nhận thành công, transaction mới chuyển Booking/Payment sang REFUNDED, ghi số tiền/ngày hoàn, trả ghế, điều chỉnh tổng chi tiêu và hạng thành viên (bỏ qua khi `spendingRecorded = false`, tức thanh toán trễ chưa từng được cộng); thông báo ghế chạy sau commit. Duyệt lặp khi đã REFUNDED không hoàn lại lần nữa. Người xử lý/ghi chú được lưu từ lúc gửi yêu cầu; không đồng nghĩa đã hoàn tiền. Không duyệt nếu vé đã check-in. CASH vẫn được xác nhận hoàn thủ công tại quầy; các phương thức khác chưa được hỗ trợ tự động. Từ chối đưa booking về COMPLETED nhưng bị chặn khi lần thử còn PROCESSING/UNKNOWN. Hoàn tiền không tự coi bắp nước đã được trả vật lý.

UI quản lý đọc trạng thái thực tế: chỉ báo thành công khi REFUNDED; nếu chưa xác nhận thì giữ đơn chờ và hiển thị “Kiểm tra kết quả”. API `/v1/vnpay/refund` trả tên trạng thái booking trong `result`, thay cho phản hồi thô từ cổng.

## Bắp nước, realtime và check-in

Tồn kho vẫn được sử dụng: `FoodStockService.reserve` trừ tồn khi tạo booking, `release` hoàn tồn khi hủy/hết hạn; stock null là không giới hạn. Có `notifyLowStock` và type LOW_STOCK. Việc không có trang tồn kho riêng không đồng nghĩa đã gỡ nghiệp vụ tồn kho.

SockJS endpoint mặc định `http://localhost:8081/api/ws`; broker `/topic`, application prefix `/app`; topic ghế `/topic/showtime/{showtimeId}/seats`. Payload `SeatStatusEvent` chứa `seatId`, `status`. `TicketService` kết hợp DB với Redis để trả `displayStatus`.

Check-in nhận chuỗi QR đầy đủ (phải khớp QR đã cấp cho vé) hoặc booking code. Số ID vé trơn bị từ chối (`CHECKIN_CODE_NOT_ACCEPTED`) vì ID tăng dần, gõ nhầm sẽ soát mất vé của khách khác. Booking code xử lý các vé của đơn. Ảnh QR gửi multipart field `qrImage` đến `/ticket/check-in/qr-image`. Vé hợp lệ có booking COMPLETED, payment PAID và trạng thái BOOKED. Lần soát mới chỉ được mở từ `TicketService.CHECK_IN_OPENS_MINUTES_BEFORE` (60) phút trước giờ chiếu đến khi suất kết thúc, và không áp dụng cho suất CANCELLED (`CHECKIN_TOO_EARLY`, `CHECKIN_SHOWTIME_ENDED`, `CHECKIN_SHOWTIME_CANCELLED`). Đổi số phút thì sửa cả thông báo lỗi. Backend ghi `checkedInAt` và `checkedInBy`, giữ thông tin lần check-in đầu và trả `alreadyCheckedIn` khi quét lại, kể cả sau khi suất đã kết thúc.

## Vận hành và API chính

Tất cả đường dẫn sau tương đối với `http://localhost:8081/api`; controller không thêm lại `/api`.

| Nhóm | Endpoint tiêu biểu |
| --- | --- |
| Auth/user | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `/sign-up`, `/users`, `/my-info` |
| Phim | `/movie`, `/movie/now-showing`, `/movie/upcoming`, `/movie/{id}/ratings`, `/movie/{id}/rating`, `/movie/media`, `/genre`, `/director` |
| Rạp/phòng/ghế | `/branch`, `/room`, `/seat/room/{roomId}`, `PUT /seat/room/{roomId}/layout` |
| Suất chiếu/vé | `/showtime`, `/showtime/today`, `/showtime/movie/{id}`, `/showtime/branch/{id}`, `/ticket/showtime/{id}`, `/ticket/check-in` |
| Đơn hàng | `/booking`, `/booking/staff`, `/booking/my-bookings/list`, `/booking/{id}/apply-promotion` |
| Hoàn tiền | `/booking/refunds`, `/booking/{id}/refund-request`, `/booking/{id}/refund-process`, `/booking/{id}/refund-decision` |
| Bắp nước/khuyến mãi | `/food`, `/food/all`, `/promotion`, `/promotion/available`, `/promotion/validate` |
| VNPay | `/v1/vnpay/payment-url`, `/v1/vnpay/return`, `/v1/vnpay/ipn`, `/v1/vnpay/querydr`, `/v1/vnpay/refund` |
| Dashboard | `/staff/dashboard`, `/admin/analytics/dashboard` |
| Quầy | `/staff/customers/lookup?phone=&email=` (ADMIN/STAFF, tra cứu khách trước khi bán) |
| Báo cáo | `/admin/operations/daily-report`, `/admin/reports/revenue`, `/admin/reports/export/revenue.xlsx`, `/admin/reports/export/operations.xlsx` |
| Hệ thống | `/notifications`, `/notifications/unread-count`, `POST /notifications/{id}/read`, `/admin/audit-logs`, `/admin/settings` |

Staff dashboard hiện tính doanh thu/đơn/vé bán của chính nhân viên trong ngày, cùng số liệu đối soát két: `cashCollected` (đơn tiền mặt thanh toán hôm nay, kể cả đơn hoàn sau đó), `cashRefunded` (đơn tiền mặt của nhân viên đó được hoàn hôm nay, kể cả đơn bán ngày trước) và `cashExpected` = thu − hoàn. Tiền hoàn được tính cho người bán vì hệ thống không ghi ai đưa tiền mặt cho khách; check-in và yêu cầu hoàn tiền theo chi nhánh, kèm đơn gần đây và suất chiếu sắp tới. Không còn StaffShift, StaffSchedule, mở/chốt ca, bàn giao hay lịch trực.

`DataConsistencyJob` giữ dữ liệu dẫn xuất: mỗi giờ chuyển trạng thái phim theo ngày (UPCOMING → NOW_SHOWING khi tới `releaseDate`, → ENDED khi qua `endDate`; chỉ đi tới và chỉ với phim có ngày, nên không lật ngược quyết định thủ công); 03:00 hằng đêm đối soát `users.total_spending` với tổng các đơn đã cộng (`spending_recorded`) và hạng thành viên, chỉ ghi log WARN các tài khoản lệch, không tự sửa. `SeatService` cập nhật `rooms.seat_capacity` bằng số ghế thật sau khi thêm, xóa hoặc chuyển ghế; báo cáo tỷ lệ lấp đầy dùng giá trị này.

`AdminAnalyticsService` mặc định lấy 30 ngày. Chỉ số doanh thu lấy theo ngày thanh toán, còn tỷ lệ lấp đầy lấy theo ngày chiếu. `RevenueReportService` lọc theo khoảng ngày thanh toán, chi nhánh, phim, nhân viên và phương thức. Tổng hợp dùng toàn bộ tập kết quả đã lọc, còn DTO và file XLSX doanh thu lấy tối đa 200 dòng chi tiết.

`OperationsReportResponse` có `summary`, `paymentBreakdown`, `refundQueue`, `showtimeLoads`; không còn phần báo cáo ca/lịch trực/tồn kho. XLSX operations hiện xuất các chỉ số tổng hợp, không phải toàn bộ mọi danh sách trong DTO.

Notification lọc ngay trong truy vấn `findVisibleCandidates` (gửi riêng cho người dùng, không chỉ định role, hoặc đúng role và chi nhánh), lấy 100 bản ghi mới nhất rồi `canView` quyết định cuối cùng; unread count dựa trên cùng tập này. Trạng thái đã đọc nằm trong `notification_reads` theo từng người (`NotificationRead`): một nhân viên đọc thông báo chung của chi nhánh không làm người khác thấy đã đọc. API vẫn trả `read`/`readAt` của người đang xem.

System settings mặc định: `booking.holdMinutes=6`, `booking.maxTicketsPerTransaction=8`, `booking.maxPendingPerUser=2`, `refund.windowHours=24`, `cinema.supportEmail`, `cinema.supportHotline`.

Các API đọc đơn của khách trả `refundDeadline` theo `refund.windowHours` hiện tại, tính từ `payment.paidAt`; chỉ có giá trị cho đơn COMPLETED đã thanh toán và chưa check-in. Frontend dùng thời hạn này thay vì tự cộng cố định 24 giờ. Cập nhật hồ sơ cá nhân dùng `UpdateProfileRequest` chỉ cho phép `fullName`, `dob`, `phoneNumber`, `gender`, `email`; không thay đổi quyền, chi nhánh hay trạng thái tài khoản.

## Migration và kiểm tra

### Flyway

Kết nối MySQL đặt `time_zone = '+07:00'` qua `spring.datasource.hikari.connection-init-sql`, nên `CURRENT_TIMESTAMP` trong DEFAULT/ON UPDATE và SQL thuần dùng giờ rạp như `Clock` của ứng dụng, kể cả khi server MySQL chạy UTC.

Schema do Flyway quản lý trong [src/main/resources/db/migration](src/main/resources/db/migration) và chạy tự động khi backend khởi động, trước khi Hibernate kiểm tra entity (`ddl-auto: validate`). Không có đoạn code nào sửa schema lúc chạy; `BackendApplication` và `DataSeedService` trước đây tự `ALTER` cột `bookings.status`/`users.role` ở mỗi lần khởi động, việc đó nay nằm trong V2.

| Version | Nội dung |
| --- | --- |
| [V1__baseline_schema](src/main/resources/db/migration/V1__baseline_schema.sql) | Toàn bộ schema cho database rỗng: bảng, index (`uk_*`, `idx_*`), CHECK (`chk_*`), FK (`fk_*`). Tên ràng buộc trùng với `@Table` của entity. |
| [V2__legacy_catch_up](src/main/resources/db/migration/V2__legacy_catch_up.sql) | Đưa database có từ trước Flyway về đúng V1. Gộp các script chạy tay trước đây: marker lần hoàn tiền VNPay trong `payments`; cờ `promotion_usage_reserved`, `spending_recorded`; `users.role` thành VARCHAR và chỉ giữ `chk_users_role`; bảng/cột còn thiếu (`system_settings`, `notifications`, `audit_logs`, `users.branch_id`, cột tồn kho của `foods`); index check-in QR, job hết hạn, giới hạn đơn chờ, lịch chiếu, thông báo/nhật ký; NOT NULL cho tài khoản, trạng thái/số tiền đơn, `used_count`, `active`, tên thể loại (unique); `bookings.status` VARCHAR(50); CHECK số tiền/tỷ lệ/điểm; FK `branch_id` của users/foods/promotions (RESTRICT). Mọi bước kiểm tra trước khi đổi nên trên database tạo từ V1 không thay đổi gì. |
| [V3__money_precision_and_enum_checks](src/main/resources/db/migration/V3__money_precision_and_enum_checks.sql) | Mọi cột tiền thành DECIMAL(15,2) (trước trộn 38/15/12); `refund_gateway_status` thống nhất VARCHAR(20); CHECK cho `payment_status`, `refund_gateway_status`. Quy ước enum: cột ENUM của MySQL giữ nguyên, enum lưu VARCHAR luôn có CHECK; thêm giá trị enum trong Java cần migration tương ứng. |
| [V4__notification_reads](src/main/resources/db/migration/V4__notification_reads.sql) | Bảng `notification_reads` (đã đọc theo từng người). Chép trạng thái cũ cho mọi người nhận hợp lệ để giữ nguyên những gì họ đang thấy, rồi bỏ cột `notifications.read_at`. |
| [V5__payment_events](src/main/resources/db/migration/V5__payment_events.sql) | Nhật ký chỉ ghi thêm `payment_events`: mỗi callback VNPay (return/IPN, kể cả sai chữ ký hoặc không khớp đơn) và mỗi lần gửi/truy vấn hoàn tiền với mã phản hồi. Không lưu chữ ký. FK tới bookings chặn xóa đơn đã có giao dịch. |
| [V6__room_seat_capacity](src/main/resources/db/migration/V6__room_seat_capacity.sql) | Tính lại `seat_capacity` bằng số ghế thật; CHECK không âm. |
| [V7__audit_refund_requested](src/main/resources/db/migration/V7__audit_refund_requested.sql) | Thêm `REFUND_REQUESTED` vào ENUM `audit_logs.action` cho yêu cầu hoàn do nhân viên gửi thay khách. |

Database rỗng: tạo `cinema` (utf8mb4) rồi khởi động backend, Flyway chạy V1 và V2. Database đã có bảng nhưng chưa có `flyway_schema_history`: `baseline-on-migrate` đánh dấu V1 rồi chạy V2. Điều kiện là database đã ở trạng thái sau các script `20261111_*` (PK `id`, bảng `payments` tách riêng…); nếu chưa, chạy các script đó trước theo bảng bên dưới.

V2 kiểm tra dữ liệu trước khi siết ràng buộc và dừng với thông báo cụ thể nếu có NULL bắt buộc, tên thể loại hoặc mã QR trùng, chi nhánh mồ côi, giá trị âm hay ngoài khoảng. Nó chỉ tự chuẩn hóa NULL có một nghĩa duy nhất: `used_count` → 0, `active` NULL → 0 (ứng dụng coi là không hoạt động), user `status` NULL → ACTIVE, `role` NULL → USER, `discount_amount` NULL → 0. Khi V2 dừng: sửa dữ liệu theo thông báo, xóa dòng lỗi bằng `DELETE FROM flyway_schema_history WHERE success = 0;` rồi khởi động lại. MySQL không rollback DDL nhưng mọi bước của V2 đều chạy lại được.

Khi đổi entity: thêm `V{n}__mo_ta.sql` mới (không sửa file đã phát hành), đặt tên ràng buộc/index giống trong `@Table`, chạy `mvn test` và khởi động thử trên database rỗng lẫn bản sao dữ liệu. Không dùng `ddl-auto: update`. Sau thay đổi này, việc xóa chi nhánh còn nhân viên/món/khuyến mãi bị FK chặn và tạo thể loại trùng tên trả lỗi ràng buộc dữ liệu.

Marker lần hoàn tiền trong V2 không sửa lịch sử: đơn REFUNDED từ phiên bản cũ có marker null không phải bằng chứng VNPay đã hoàn tiền, cần đối soát riêng, không gửi lại hàng loạt.

### Script chạy tay cho database rất cũ

`migrations/` chỉ còn các script `20261111_*` cho database có trước đợt chuyển PK sang `id` và tách payments. Chạy khi backend dừng, sau khi sao lưu, theo phụ thuộc dưới đây (không chạy cả thư mục theo thứ tự tên), rồi mới khởi động backend để Flyway baseline và chạy V2.

| Thay đổi | Script trong `migrations/` và điều kiện |
| --- | --- |
| Đổi khóa chính đơn sang `id` | [primary_keys_to_id](migrations/20261111_primary_keys_to_id.sql). Giữ giá trị, AUTO_INCREMENT và cập nhật khóa ngoại. Chạy trước các script tham chiếu PK `id` nếu schema vẫn dùng tên cũ. |
| Chi nhánh, phòng, ghế | [branch_room_constraints](migrations/20261111_branch_room_constraints.sql), [seat_constraints](migrations/20261111_seat_constraints.sql). Mã phòng tối đa 50 ký tự. Dữ liệu ghế cần mã và vị trí hợp lệ, không trùng trong phòng. |
| Công nghệ phòng, định dạng chiếu | [screening_format_room_technology](migrations/20261111_screening_format_room_technology.sql). Phòng 2D/3D cũ chuyển thành STANDARD, định dạng 3D được giữ ở suất chiếu. Kiểm tra lại định dạng của suất IMAX/4DX cũ. |
| Thời gian, trạng thái và giá suất | [showtime_time_constraints](migrations/20261111_showtime_time_constraints.sql), [showtime_status_not_null](migrations/20261111_showtime_status_not_null.sql), [showtime_ticket_price](migrations/20261111_showtime_ticket_price.sql). Sửa lịch thiếu giờ, giờ kết thúc sai hoặc trạng thái NULL trước khi siết ràng buộc. |
| Metadata và khả năng hiển thị phim | [movie_editor](migrations/20261111_movie_editor.sql) thêm metadata và cột `published` trên schema cũ. Chạy [movie_is_public](migrations/20261111_movie_is_public.sql) sau bước đó nếu còn `published`. [remove_movie_inactive](migrations/20261111_remove_movie_inactive.sql) yêu cầu xử lý phim INACTIVE trước. |
| Timestamp phim và đánh giá | [movie_timestamps_director_names](migrations/20261111_movie_timestamps_director_names.sql) thêm timestamp và cho phép đạo diễn trùng tên. [movie_rating_timestamps_not_null](migrations/20261111_movie_rating_timestamps_not_null.sql) điền timestamp thiếu trước khi đặt NOT NULL. |
| Booking và vé | [booking_booked_staff](migrations/20261111_booking_booked_staff.sql), [ticket_checked_in_by](migrations/20261111_ticket_checked_in_by.sql), [ticket_status_booking_code_not_null](migrations/20261111_ticket_status_booking_code_not_null.sql). Dữ liệu cũ có NULL ở trạng thái vé hoặc mã đơn cần được sửa trước khi siết ràng buộc. |
| Payment một-một | [extract_booking_payments](migrations/20261111_extract_booking_payments.sql) đối chiếu dữ liệu rồi mới xóa các cột payment trong bookings. |
| Dọn cấu hình và bảng cũ | [remove_per_movie_ticket_limit](migrations/20261111_remove_per_movie_ticket_limit.sql), [remove_staff_handover](migrations/20261111_remove_staff_handover.sql) trước [remove_staff_scheduling](migrations/20261111_remove_staff_scheduling.sql), [drop_unused_food_stock_transactions](migrations/20261111_drop_unused_food_stock_transactions.sql) cho bảng lịch sử tồn cũ. |

`PaymentPersistenceIntegrationTest` chạy trên database bản sao `cinema_payment_test_YYYYMMDDHHMMSS` có dữ liệu (cần phòng, suất chiếu), với `PAYMENT_TEST_DATABASE`, `PAYMENT_TEST_USER`, `PAYMENT_TEST_PASSWORD` và tùy chọn `PAYMENT_TEST_PORT` (mặc định 3306). Flyway tự migrate bản sao khi test khởi động. Test xác nhận schema và lưu/cập nhật/xóa booking cùng payment trong transaction rollback.

Khi cần dùng các script gỡ chức năng, đọc đúng thứ tự phụ thuộc: `remove_staff_handover` còn giữ STAFF_SCHEDULE, sau đó `remove_staff_scheduling` mới loại STAFF_SCHEDULE. `drop_unused_food_stock_transactions` chỉ xóa bảng lịch sử cũ; tồn hiện tại vẫn nằm ở Food.

Test hiện có trong `src/test/java/com/ltweb/backend/service/` bao phủ thanh toán/persistence, refund, transaction effects, giới hạn vé, staff dashboard, tồn bắp nước, giá suất chiếu, layout ghế, mapping check-in và ràng buộc schema. `JwtSecurityTest` kiểm tra phân loại token, logout, refresh/replay/đồng thời, tài khoản bị khóa, chữ ký sai và claim thiếu/lỗi; Redis được giả lập trong test này. Chạy riêng bằng `mvn -Dtest=JwtSecurityTest test`, hoặc chạy toàn bộ bằng `mvn test`. `SensitiveApiSecurityTest` dựng chuỗi filter thật bằng MockMvc: xác nhận chỉ có `JwtAuthenticationFilter` (không còn `BearerTokenAuthenticationFilter`), access token hợp lệ vào được `/my-info`, request thiếu token/refresh token/header sai trả `401`, role không đủ trả `403` kèm `WWW-Authenticate`, route public và OAuth2 Google vẫn hoạt động, cùng điều kiện đăng ký cleanup. `VnpayManagementSecurityTest` và `UserProfileSecurityTest` kiểm tra quyền quản lý VNPay và cập nhật hồ sơ. Không sửa mã MapStruct sinh ra trong `target/`.

`BookingCheckoutRulesTest` kiểm tra giữ/trả/đổi lượt khuyến mãi, giới hạn đơn chờ, thời hạn bán online và tại quầy, giữ ghế Redis cho đơn quầy chưa trả tiền mặt, định dạng mã đơn và giới hạn số lượng bắp nước. `BookingCleanupJobTest` kiểm tra mỗi đơn hết hạn chạy transaction riêng. `DataIntegrityRulesTest` kiểm tra đã đọc theo từng người, nội dung nhật ký thanh toán (không lưu chữ ký), đồng bộ sức chứa phòng và phân loại lỗi ràng buộc không lộ SQL. `VnpayPaymentTest` có các trường hợp thanh toán trễ.

`BookingRefundFlowTest` kiểm tra commit trước gọi cổng, timeout/query lại, chống gửi trùng khi đồng thời, lỗi commit và CASH. Transaction/concurrency được giả lập trong unit test; không thay thế kiểm thử MySQL. `VnpayRefundGatewayTest` kiểm tra chữ ký, đối chiếu giao dịch, pending/rejection và phản hồi không rõ kết quả bằng HTTP mock; `RefundDecisionResponseTest` kiểm tra cả hai route không báo thành công sớm. Test persistence cần DB riêng qua `PAYMENT_TEST_DATABASE`; bị skip nếu chưa cấu hình.
