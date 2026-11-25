# Kiến trúc backend

> Đối chiếu mã nguồn ngày 2026-11-25, nhánh `fix/backend-review-cleanup` (tách từ commit `7105c25`).

Mã nguồn ở `backend/src/main/java/com/ltweb/backend/`. Điểm vào là [BackendApplication.java](../../backend/src/main/java/com/ltweb/backend/BackendApplication.java) (`@EnableScheduling`, nạp `VnpayProperties`). Cấu hình runtime ở [application.yaml](../../backend/src/main/resources/application.yaml), giải thích trong [configuration.md](../01-getting-started/configuration.md).

## Package

| Package | Trách nhiệm | Ví dụ |
| --- | --- | --- |
| `controller` | Nhận HTTP, đọc tham số, gọi service, bọc kết quả trong `ApiResponse`. Không chứa nghiệp vụ. | `BookingController`, `VnpayController` |
| `service` | Nghiệp vụ, kiểm tra quyền chủ sở hữu và chi nhánh, ranh giới transaction. | `BookingCheckoutService`, `TicketService` |
| `repository` | Spring Data JPA, JPQL `@Query`, khóa dòng `...ForUpdate`, Criteria API cho tìm kiếm. | `BookingRepository`, `BookingSearchRepositoryImpl` |
| `entity` | Entity JPA. Khóa chính luôn là `id`. Tên index và ràng buộc trong `@Table` trùng với migration. | `Booking`, `Payment`, `Ticket` |
| `dto/request`, `dto/response` | Hợp đồng JSON với frontend. | `CreateBookingRequest`, `BookingResponse` |
| `mapper` | MapStruct, sinh code lúc compile vào `target/`. | `BookingMapper` |
| `enums` | Enum lưu dạng chuỗi trong DB. | `BookingStatus`, `MembershipTier` |
| `config` | Security, JWT, OAuth2, Redis, WebSocket, `Clock`, RestTemplate, seed demo. | `SecurityConfig`, `TimeConfig` |
| `exception` | `AppException`, `ErrorCode`, `GlobalExceptionHandler`. | |
| `event` | Sự kiện miền. | `BookingPaidEvent` |
| `job` | Công việc định kỳ. | `BookingCleanupJob`, `DataConsistencyJob` |
| `util` | Hàm tiện ích không có trạng thái. | `VnpayUtil`, `TicketQrCode` |

Luồng chuẩn: `controller` → `service` → `repository`, và `mapper` dựng DTO bên trong transaction của service.

## Đặt vé được chia thành nhiều service

`BookingService` là mặt tiền giữ nguyên API cho controller và listener, và ủy quyền cho:

| Service | Trách nhiệm |
| --- | --- |
| `BookingCheckoutService` | Tạo đơn online và tại quầy: khóa vé, giữ ghế Redis, giữ tồn bắp nước, giữ lượt khuyến mãi, sinh mã đơn. |
| `BookingCommandService` | Hủy, sửa trạng thái, áp mã khuyến mãi, gửi yêu cầu hoàn. |
| `BookingQueryService` | Đọc đơn, danh sách "Vé của tôi", tìm kiếm phân trang cho quản lý, danh sách hoàn tiền, tính `refundDeadline`. |
| `BookingRefundService` | Duyệt, từ chối, gửi và đối soát hoàn tiền với VNPay. |
| `BookingMembershipService` | Cộng chi tiêu và tính hạng sau thanh toán, chốt lượt khuyến mãi. |
| `BookingPricingService` | Tính tiền vé, bắp nước, giảm giá. Dùng chung cho tạo đơn và áp mã. |
| `BookingReleaseService` | Nơi duy nhất trả tài nguyên: `releaseSeats`, `releaseUnpaid` (thêm tồn bắp nước và lượt khuyến mãi), `releasePromotionUsage`. |
| `BookingTransactionEffects` | Lấy và nhả khóa Redis giữ ghế, đăng ký hành động chạy sau commit. |
| `StaffCustomerService` | Tìm hoặc tạo khách tại quầy, che thông tin khi tra cứu. |

Ngoài đặt vé: `AuthService` điều phối đăng nhập, refresh và đăng nhập Google. `PasswordRecoveryService` xử lý đổi, quên và đặt lại mật khẩu qua `OTPService`. `FoodStockService` giữ và trả tồn bắp nước. `PromotionService` kiểm tra mã và giữ lượt. `PaymentEventService` ghi nhật ký thanh toán. `StaffOperationsService` dựng dashboard nhân viên.

Các thành phần quyết định quyền:

| Thành phần | Quy tắc |
| --- | --- |
| `CurrentUserProvider` | Lấy `User` từ DB theo tên trong `SecurityContext` ở mỗi lần gọi, không cache giữa các request. `requireUser()` bắt buộc đăng nhập, `getOrNull()` cho truy cập tùy chọn. |
| `BookingAccessPolicy` | Các quy tắc riêng cho xem, quản lý, hủy, bán tại quầy, gửi hoàn thay khách và duyệt hoàn. Quyền MANAGER không tự động bao gồm quyền hủy đơn. |
| `RefundPolicy` | Điều kiện "đã thanh toán và chưa check-in", hạn gửi yêu cầu. Khi duyệt không áp lại hạn của khách. |

Khi thêm thao tác mới trên đơn, tái sử dụng các policy này thay vì viết lại điều kiện.

## Transaction

- Mỗi use case ghi dữ liệu là một method `@Transactional` của service. Đọc dùng `@Transactional(readOnly = true)`.
- Đơn và vé bị khóa bằng `SELECT ... FOR UPDATE` (`findByIdForUpdate`, `findSeatsForUpdate`, `findByShowtimeIdForUpdate`). Vé luôn được khóa theo thứ tự id để tránh deadlock.
- Lượt khuyến mãi dùng một câu `UPDATE` có điều kiện thay vì đọc rồi ghi, để nguyên tử ở DB.
- Thao tác ra ngoài phải chạy sau commit để không phát sự kiện cho dữ liệu chưa tồn tại:
  - Phát trạng thái ghế qua STOMP và nhả khóa Redis: `BookingTransactionEffects.afterCommit` và `releaseAfterCommit`.
  - Gửi email vé và cập nhật hạng: `@TransactionalEventListener(phase = AFTER_COMMIT)` cộng `REQUIRES_NEW` trên `BookingTicketEmailListener` và `MembershipUpdateListener`.
  - Lỗi ở các bước này chỉ ghi log, vì DB đã commit.
- Lấy khóa Redis lỗi giữa chừng thì chỉ nhả các khóa đã lấy. Transaction rollback cũng nhả khóa của transaction đó.
- Hoàn tiền VNPay không giữ transaction trong lúc gọi mạng. `BookingRefundService` dùng `TransactionTemplate` `REQUIRES_NEW` cho bước ghi lần thử và bước ghi kết quả, gọi `entityManager.clear()` trước khi đọc lại dưới khóa. Xem [ADR-0006](../08-decisions/0006-refund-commit-before-gateway.md).
- `PaymentEventService` ghi `payment_events` trong cùng transaction với thay đổi của đơn, không dùng `REQUIRES_NEW`, vì dòng booking đang bị khóa.

## Tải dữ liệu JPA

`spring.jpa.open-in-view: false` ([ADR-0004](../08-decisions/0004-disable-open-session-in-view.md)):

- Quan hệ lazy chỉ đọc được bên trong transaction của service. Map entity sang DTO bên trong method `@Transactional`, không trả entity cho controller.
- Mọi `@ManyToOne` là `LAZY`. `default_batch_fetch_size: 50` gom các lần tải proxy và collection. `Booking.bookingFoods` có `@BatchSize(100)`.
- Không dùng `findFirst` hay `Pageable` cùng `@EntityGraph` có collection. Hibernate sẽ cắt trang trong bộ nhớ (cảnh báo HHH90003004). Khi cần giới hạn số dòng kèm collection, lấy ID có giới hạn trước rồi tải chi tiết, như `BookingRepository.findRecent`.
- `ReadEndpointsSmokeTest` gọi mọi API GET để bắt lỗi lazy loading.

## Truy vấn báo cáo

`AdminAnalyticsService`, `RevenueReportService`, `OperationsReportService` và `StaffOperationsService` lọc theo ngày, chi nhánh, phim, nhân viên và phương thức ngay trong JPQL, không tải cả bảng rồi lọc trong Java. Quy ước dùng chung:

- Đơn đã thanh toán là đơn `COMPLETED` hoặc có payment `PAID`.
- Ngày thanh toán là `coalesce(paidAt, updatedAt, createdAt, now)`.
- Ngày nghiệp vụ của dashboard nhân viên là `coalesce(paidAt, createdAt, đầu ngày)`.
- Doanh thu tính theo ngày thanh toán, tỷ lệ lấp đầy tính theo ngày chiếu và `rooms.seat_capacity`.

Đổi quy ước thì sửa cả truy vấn trong repository lẫn `getPaymentDate` của service. Dashboard quản trị mặc định lấy 30 ngày. Báo cáo doanh thu tổng hợp trên toàn bộ kết quả lọc, còn danh sách chi tiết trong DTO và XLSX lấy tối đa 200 dòng. Báo cáo vận hành có `summary`, `paymentBreakdown`, `refundQueue`, `showtimeLoads`, file XLSX chỉ xuất các chỉ số tổng hợp.

`GET /booking/search` lọc, đếm và phân trang ở DB qua `BookingSearchRepository` (Criteria API). `summary` tính trên toàn bộ đơn khớp bộ lọc. ADMIN lọc được mọi chi nhánh, STAFF và MANAGER bị giới hạn ở chi nhánh được phân công và nhận 403 nếu hỏi chi nhánh khác.

Thông báo được lọc ngay trong truy vấn `findVisibleCandidates` (gửi riêng cho người dùng, không chỉ định role, hoặc đúng role và chi nhánh), lấy 100 bản ghi mới nhất rồi `canView` quyết định cuối cùng. Số chưa đọc dựa trên cùng tập này.

## Bảo mật

Chuỗi filter được cấu hình trong [SecurityConfig.java](../../backend/src/main/java/com/ltweb/backend/config/SecurityConfig.java):

1. CORS cho các origin trong `app.cors.allowed-origins` (mặc định `localhost` và `127.0.0.1` ở cổng 5173, 5174, 3000, đổi bằng `APP_CORS_ALLOWED_ORIGINS`), các method GET/POST/PUT/PATCH/DELETE/OPTIONS. WebSocket `/ws` dùng cùng danh sách origin. CSRF tắt vì API dùng Bearer token, không dùng cookie phiên.
2. `JwtAuthenticationFilter` được đặt vào vị trí của `BearerTokenAuthenticationFilter` (không dùng `oauth2ResourceServer`). Filter đọc header bằng `DefaultBearerTokenResolver`, xác minh qua `JwtAuthenticationProvider` với `JwtDecoderConfig`, rồi lưu kết quả vào `SecurityContext` của request (`RequestAttributeSecurityContextRepository`, không dùng session). Request không có Bearer đi tiếp để quy tắc truy cập quyết định, nhờ vậy route công khai và OAuth2 Google vẫn chạy.
3. `JwtDecoderConfig` gọi `JwtService.verifyToken`: kiểm tra thuật toán HS512, chữ ký, các claim bắt buộc (`sub`, `jti`, `iat`, `exp`, `role`, `token_use`), `token_use = access` và access token chưa bị thu hồi. Không truy cập Redis trước khi chữ ký và claim hợp lệ.
4. Claim `role` được chuyển thành authority `ROLE_<role>` cho `hasRole` và `@PreAuthorize`.
5. Lỗi xác thực trả JSON 401 qua `JwtAuthenticationEntryPoint`. Đã xác thực JWT mà thiếu role trả 403 qua `BearerTokenAccessDeniedHandler`, kèm header `WWW-Authenticate`.

Role của mỗi endpoint được kiểm bằng `@PreAuthorize` trên method của controller (`@EnableMethodSecurity`). Service không khai báo `@PreAuthorize`, chỉ kiểm chủ sở hữu và chi nhánh. `RoleCheckPlacementTest` giữ quy ước này. Danh sách đầy đủ ở [endpoints.md](../04-api/endpoints.md).

## Xử lý lỗi

Service ném `AppException(ErrorCode.X)`. `GlobalExceptionHandler` chuyển thành `ErrorResponse` với HTTP status của mã lỗi:

| Ngoại lệ | Phản hồi |
| --- | --- |
| `AppException` | `code`, `message` theo `ErrorCode` |
| `MethodArgumentNotValidException` | 400, các thông báo validate |
| `AuthenticationException` | 401 `LOGIN_FAILED` |
| `AccessDeniedException` | 403 `ACCESS_DENIED` |
| `DataIntegrityViolationException` | MySQL 1451 → 409 `RESOURCE_IN_USE` (dữ liệu còn được tham chiếu, gợi ý ngừng hoạt động thay vì xóa), 1062 → 409 `DUPLICATE_VALUE`, còn lại 400 `DATA_INTEGRITY_VIOLATION`. Chi tiết SQL chỉ ghi log server. |
| Ngoại lệ khác | 500 `INTERNAL_ERROR` |

Định dạng phản hồi và bảng mã lỗi nằm trong [conventions.md](../04-api/conventions.md#lỗi).

## Thời gian

`TimeConfig` cung cấp một bean `Clock` theo `Asia/Ho_Chi_Minh`. Mọi code nghiệp vụ gọi `LocalDateTime.now(clock)`, không gọi `LocalDateTime.now()`. Khi test thời điểm hết hạn, inject `Clock.fixed(...)` thay vì chờ thời gian thực.

## Công việc định kỳ

| Job | Lịch | Ghi chú |
| --- | --- | --- |
| `BookingCleanupJob.releaseExpiredBookings` | `fixedRate = 120000` | Mỗi đơn một transaction `REQUIRES_NEW`. |
| `ShowtimeService.autoCloseExpiredShowtimes` | `fixedRate = 300000` | Suất `OPEN` quá giờ kết thúc → `CLOSED`. |
| `DataConsistencyJob.syncMovieStatuses` | Chờ 60 giây sau khởi động, rồi mỗi giờ | Chỉ đi tới, chỉ với phim có ngày. |
| `DataConsistencyJob.reconcileSpending` | `0 0 3 * * *` giờ rạp | Chỉ ghi log WARN, không tự sửa. |

`SeatService` cập nhật `rooms.seat_capacity` bằng số ghế thật sau mỗi lần thêm, xóa hoặc chuyển ghế.

## Seed và cleanup

`ApplicationInitConfig`, `DataSeeder` và `CleanupController` chỉ được đăng ký khi profile `dev` bật, `prod` không bật và cờ tương ứng là `true`. Hành vi và phạm vi xóa nằm trong [demo-data.md](../01-getting-started/demo-data.md).

## Định dạng code

Spotless chạy Google Java Format ở phase `validate` với `ratchetFrom` là commit baseline, nên chỉ file thay đổi từ baseline bị kiểm tra. Xem [coding-conventions.md](../07-development/coding-conventions.md#backend).
