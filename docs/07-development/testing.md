# Kiểm thử

> Đối chiếu mã nguồn ngày 2026-11-25, commit `6e80be9`.

## Lệnh

### Backend (trong `backend/`)

| Mục đích | Windows | Linux/macOS |
| --- | --- | --- |
| Chạy toàn bộ test (gồm Spotless) | `.\mvnw.cmd test` | `sh ./mvnw test` |
| Chạy một class | `.\mvnw.cmd "-Dtest=JwtSecurityTest" test` | `sh ./mvnw -Dtest=JwtSecurityTest test` |
| Chạy một method | `.\mvnw.cmd "-Dtest=BookingCheckoutRulesTest#customerCannotHoldMoreThanTheConfiguredNumberOfPendingBookings" test` | tương tự, bỏ dấu ngoặc kép |
| Compile nhanh | `.\mvnw.cmd -q -DskipTests compile` | |
| Kiểm tra, sửa định dạng | `.\mvnw.cmd spotless:check`, `spotless:apply` | |
| Tách thư mục build khỏi IDE | `.\mvnw.cmd "-Dbackend.build.directory=target/verification" test` | |

Toàn bộ test không cần MySQL hay Redis đang chạy, trừ `PaymentPersistenceIntegrationTest`. Redis được giả lập, các test cần database dùng H2.

### Frontend (trong `frontend/`)

```powershell
npm run lint                                        # ESLint và kiểm tra token màu
npm run build                                       # Build production
node --experimental-vm-modules --test tests/*.test.mjs
```

`package.json` chưa có script `test`. Các test về giờ rạp nên chạy thêm với múi giờ khác để chắc chắn không phụ thuộc máy:

```bash
TZ=UTC node --experimental-vm-modules --test tests/*.test.mjs
```

Trên PowerShell: `$env:TZ = "UTC"; node --experimental-vm-modules --test tests/*.test.mjs`.

## Phần có test tự động

### Backend

Test nằm ở `backend/src/test/java/com/ltweb/backend/service/`. `BackendServiceFixtures` dựng service thật qua constructor, chỉ giả lập repository, gateway và I/O.

| Nhóm | Test |
| --- | --- |
| Bảo mật, JWT | `JwtSecurityTest` (phân loại token, logout, refresh đồng thời và dùng lại, tài khoản khóa, chữ ký sai, claim thiếu), `ClockedJwtServiceTest`, `SensitiveApiSecurityTest` (chuỗi filter thật bằng MockMvc: 401, 403, route công khai, OAuth2, điều kiện cleanup), `VnpayManagementSecurityTest`, `UserProfileSecurityTest`, `PromotionCorsTest`, `PasswordRecoveryServiceTest` |
| Đặt vé | `BookingCheckoutRulesTest` (giữ, trả, đổi lượt khuyến mãi; giới hạn đơn chờ; hạn bán online và tại quầy; giữ ghế Redis cho đơn quầy chưa trả tiền; định dạng mã đơn; giới hạn bắp nước), `BookingTicketLimitTest`, `BookingPricingServiceTest`, `BookingTransactionEffectsTest`, `BookingCleanupJobTest` (mỗi đơn một transaction), `BookingServiceWiringTest`, `StaffCustomerServiceTest`, `FoodStockServiceTest`, `FoodAvailabilityTest` |
| Thanh toán, hoàn tiền | `VnpayPaymentTest` (gồm thanh toán trễ), `BookingServicePaymentTest`, `BookingRefundFlowTest` (commit trước khi gọi cổng, timeout rồi truy vấn, chống gửi trùng, lỗi commit, tiền mặt), `VnpayRefundGatewayTest` (chữ ký, đối chiếu giao dịch, phản hồi không rõ kết quả), `RefundDecisionResponseTest`, `BookingServiceRefundTest`, `BookingRefundDeadlineTest`, `CounterRefundRequestTest` |
| Vé, check-in | `TicketServiceTest`, `TicketCheckInMappingTest` |
| Danh mục | `ShowtimePricingTest`, `SeatLayoutConstraintsTest`, `BranchRoomConstraintsTest`, `ScreeningTechnologyTest`, `MovieEditorTest`, `MovieMetadataTest`, `MovieVisibilityJsonTest` |
| Báo cáo, tìm kiếm | `ReportQueryScopingTest`, `StaffOperationsServiceTest`, `BookingSearchServiceTest`, `BookingQueriesDatabaseTest` (truy vấn báo cáo và tìm đơn trên H2 chế độ MySQL) |
| Dữ liệu, schema | `RepositoryQueryValidationTest` (kiểm tra mọi JPQL trong `@Query` mà không cần MySQL), `DataIntegrityRulesTest`, `PrimaryKeyMappingTest`, `PaymentMappingTest`, `DataSeederPrimaryKeyTest`, `DemoSeedConfigurationTest`, `BackendPoliciesTest` |
| Khói toàn ứng dụng | `ReadEndpointsSmokeTest`: khởi động cả ứng dụng trên H2 với cấu hình JPA thật, Redis giả lập, gọi mọi API GET với từng vai trò cùng vài luồng ghi, báo lỗi khi có phản hồi 5xx. Thêm endpoint đọc mới vào `paths()`. |

Transaction và concurrency trong unit test là giả lập. H2 tạo schema từ entity, không chạy Flyway. Các test này không thay thế kiểm thử trên MySQL thật.

### Test cần MySQL

`PaymentPersistenceIntegrationTest` kiểm tra schema thật và lưu, cập nhật, xóa booking cùng payment trong transaction rollback. Test chỉ chạy khi có biến môi trường trỏ tới một **bản sao dùng một lần**, tên phải khớp `cinema_payment_test_YYYYMMDDHHMMSS`:

```powershell
# Tạo bản sao từ database demo (cần có phòng và suất chiếu)
mysqldump -u root -p cinema > cinema.sql
mysql -u root -p -e "CREATE DATABASE cinema_payment_test_20261121120000 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p cinema_payment_test_20261121120000 < cinema.sql

$env:PAYMENT_TEST_DATABASE = "cinema_payment_test_20261121120000"
$env:PAYMENT_TEST_USER = "root"
$env:PAYMENT_TEST_PASSWORD = "<mat_khau>"
$env:PAYMENT_TEST_PORT = "3306"   # tùy chọn
.\mvnw.cmd "-Dtest=PaymentPersistenceIntegrationTest" test
```

Flyway tự migrate bản sao khi test khởi động. Không trỏ biến này vào database `cinema` đang dùng.

### Frontend

| Test | Kiểm tra |
| --- | --- |
| `axiosClient.test.mjs` | Gắn token, gộp nhiều 401 vào một lần refresh, dùng lại token mới cho 401 đến muộn |
| `authApi.test.mjs` | Logout gửi cả hai token trong body với `skipAuth` |
| `bookingFormat.test.mjs` | Phân loại vé, đọc giờ rạp, hạn hoàn do backend trả |
| `bookingManagement.test.mjs` | Duyệt hoàn chỉ báo thành công khi `REFUNDED` |
| `cinemaTime.test.mjs` | Giờ rạp không phụ thuộc múi giờ máy |
| `profile.test.mjs` | Form hồ sơ gửi `dob`, không gửi trường quản trị |
| `useModalDialog.test.mjs` | Esc, modal lồng nhau, click nền |
| `opsRules.test.mjs` | Luật khu vận hành: class cũ, inline style, svg, emoji, chữ giao diện, import, mã hex trong JSX; tiền tố `o-`, `!important`, `@layer`, `box-shadow`, `font-family` trong CSS |
| `opsGuard.test.mjs` | Hook `ops-guard.mjs`: báo vi phạm với exit 2, không chặn khi input hỏng, file ngoài phạm vi vận hành hoặc file đã xoá |
| `opsNav.test.mjs` | Mục điều hướng cho STAFF, MANAGER và ADMIN |
| `opsFormat.test.mjs` | Tiền Việt Nam, ngày tương đối theo múi giờ rạp |
| `showtimeRail.test.mjs` | Cửa sổ giờ, vị trí, trạng thái suất và làm tròn giờ tạo suất |

`componentHarness.mjs` là bộ dựng component dùng chung. Nó giả lập `useState` theo thứ tự khai báo, nên component được test phải thêm state mới ở cuối.

Mốc đối chiếu frontend ngày 2026-11-25 có 44 test đạt, kể cả khi chạy với `TZ=UTC`. Mốc backend ngày 2026-11-21 có 268 test, 0 lỗi và 6 test bỏ qua khi chưa cấu hình bản sao MySQL cho `PaymentPersistenceIntegrationTest`.

## Phần kiểm thử tay

Chưa có test end-to-end tự động. Các luồng sau cần thử tay trên trình duyệt với backend thật, theo kịch bản trong [09-report/test-cases](../09-report/test-cases/):

- Chọn ghế realtime giữa hai tab, giữ ghế hết hạn sau 6 phút và job trả ghế.
- Thanh toán VNPay sandbox, return URL, thanh toán thất bại.
- Đăng nhập Google, quên mật khẩu qua email.
- Bán vé tại quầy tiền mặt và VNPay, in phiếu.
- Soát vé bằng camera, ảnh QR và mã đơn.
- Hoàn tiền VNPay và tiền mặt.
- Giao diện từng vai trò ở 1280, 1024, 768 và 390px. Dùng `/ops-gallery` khi chạy Vite dev để thử hai mật độ, trạng thái bảng, focus và Esc.
- Chạy Lighthouse Accessibility cho Tổng quan ca, Soát vé, Đơn đặt vé và Suất chiếu. Thử bán vé tại quầy và duyệt hoàn tiền bằng bàn phím và NVDA trên Chrome.

## Trước khi merge

Danh sách kiểm tra nằm ở [git-workflow.md](git-workflow.md#điều-kiện-merge). Tối thiểu: test backend và frontend pass, `npm run lint` và `npm run build` pass, đã thử tay luồng bị ảnh hưởng với đúng role.
