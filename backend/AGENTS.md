# Hướng dẫn AI cho backend

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Áp dụng cho `backend/`. Đọc [quy tắc toàn dự án](../AGENTS.md) trước. Kiến trúc backend nằm trong [docs/03-architecture/backend.md](../docs/03-architecture/backend.md), nghiệp vụ trong [docs/02-domain](../docs/02-domain/).

Java 21, Spring Boot 3.4.0, Maven Wrapper. API ở `http://localhost:8081/api`. Cần MySQL (schema `cinema`) và Redis khi chạy ứng dụng, không cần khi chạy test.

## Lệnh

Chạy trong `backend/`. Linux/macOS thay `.\mvnw.cmd` bằng `sh ./mvnw`.

```powershell
.\mvnw.cmd spring-boot:run                     # chạy ứng dụng
.\mvnw.cmd -q -DskipTests compile              # compile nhanh
.\mvnw.cmd test                                # toàn bộ test, gồm Spotless check
.\mvnw.cmd "-Dtest=JwtSecurityTest" test       # một class
.\mvnw.cmd spotless:apply                      # sửa định dạng Java
.\mvnw.cmd -q -DskipTests package              # đóng gói
.\mvnw.cmd "-Dbackend.build.directory=target/verification" test   # tách output khỏi IDE
```

Test persistence trên MySQL và các biến `PAYMENT_TEST_*`: [testing.md](../docs/07-development/testing.md#test-cần-mysql). Bật seed hoặc cleanup demo: [demo-data.md](../docs/01-getting-started/demo-data.md).

## Quy tắc bắt buộc

- Với luồng REST, đối chiếu controller, DTO, mapper, service và client tương ứng trong [frontend/src/api](../frontend/src/api). Thêm endpoint theo [add-endpoint.md](../docs/07-development/how-to/add-endpoint.md) và cập nhật [endpoints.md](../docs/04-api/endpoints.md).
- Giữ phân quyền ở backend. Kiểm tra role, trạng thái tài khoản, chủ sở hữu và chi nhánh theo đúng nghiệp vụ. Tái sử dụng `CurrentUserProvider`, `BookingAccessPolicy` và `RefundPolicy`. Quyền MANAGER không tự động bao gồm quyền hủy đơn.
- Khi sửa giữ ghế, thanh toán, hoàn tiền hoặc tồn kho, kiểm tra khóa DB, chủ sở hữu khóa Redis, rollback, retry và xử lý sau commit. Tái sử dụng `BookingTransactionEffects` và `BookingReleaseService` (nơi duy nhất trả tài nguyên của đơn).
- Không giữ transaction DB trong lúc gọi VNPay. Hoàn tiền đi qua `BookingRefundService`. Giữ tính idempotent của callback (payment đã `PAID` trả `02`).
- Dùng `Clock` được inject cho nghiệp vụ phụ thuộc thời gian và `Clock.fixed` trong test thời gian.
- `open-in-view` đã tắt: map DTO bên trong method `@Transactional` của service, không trả entity. Không dùng `findFirst`/`Pageable` cùng `@EntityGraph` có collection. Endpoint đọc mới thêm vào `paths()` của `ReadEndpointsSmokeTest`.
- Kiểm tra hợp đồng JSON theo DTO và mapper, gồm các trường Payment phẳng trong `BookingResponse`.
- Làm việc trên source dưới `src/`. Không sửa mã MapStruct sinh trong `target/`. Khi sửa Java, chạy Spotless theo baseline trong `pom.xml`.
- Schema chỉ đổi qua Flyway: thêm `V{n}__mo_ta.sql` mới trong [db/migration](src/main/resources/db/migration), không sửa migration đã phát hành, không sửa schema bằng code lúc chạy, không bật `ddl-auto: update`. Đặt tên index và ràng buộc giống `@Table` của entity. Thêm giá trị enum thì cập nhật `ENUM`/`CHECK`. Kiểm tra trên database rỗng và bản sao có dữ liệu. Xem [add-migration.md](../docs/07-development/how-to/add-migration.md).
- Đối chiếu entity, migration Flyway và [script cũ](migrations) khi sửa persistence. Chỉ chạy reset, seed hoặc migration ghi dữ liệu trong phạm vi người dùng cho phép. Giữ bí mật trong cấu hình cục bộ.

## Bản đồ điểm vào

Mã nguồn ở `src/main/java/com/ltweb/backend/`.

| Chủ đề | Class |
| --- | --- |
| Cấu hình, bảo mật | `config/SecurityConfig`, `JwtAuthenticationFilter`, `JwtDecoderConfig`, `JwtAuthenticationEntryPoint`, `OAuth2LoginSuccessHandler`, `TimeConfig`, `WebSocketConfig`, `AppConfig` (timeout RestTemplate) |
| Xác thực | `service/AuthService`, `JwtService`, `PasswordRecoveryService`, `OTPService`, `CurrentUserProvider` |
| Đặt vé | `service/BookingService` → `BookingCheckoutService`, `BookingCommandService`, `BookingQueryService`, `BookingRefundService`, `BookingMembershipService`; `BookingPricingService`, `BookingReleaseService`, `BookingTransactionEffects`, `StaffCustomerService`; policy `BookingAccessPolicy`, `RefundPolicy` |
| Thanh toán | `service/VnpayService`, `VnpayCallbackService`, `VnpayRefundGateway`, `PaymentEventService`, `util/VnpayUtil` |
| Vé, check-in, suất chiếu | `service/TicketService`, `ShowtimeService`, `SeatService`, `RoomService` |
| Sự kiện sau thanh toán | `event/BookingPaidEvent`, `service/BookingTicketEmailListener`, `MembershipUpdateListener`, `EmailService` |
| Job | `job/BookingCleanupJob`, `job/DataConsistencyJob`, `ShowtimeService.autoCloseExpiredShowtimes` |
| Báo cáo | `service/AdminAnalyticsService`, `RevenueReportService`, `OperationsReportService`, `StaffOperationsService`, `XlsxExportService` |
| Lỗi | `exception/ErrorCode`, `AppException`, `GlobalExceptionHandler` |
| Schema | `src/main/resources/db/migration/V1` tới `V7`; database rất cũ: `migrations/20261111_*` |
| Test | `src/test/java/com/ltweb/backend/service/`, dựng service bằng `BackendServiceFixtures` |
