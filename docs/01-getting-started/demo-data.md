# Dữ liệu demo và tài khoản

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

> [!WARNING]
> Mọi cách nạp dữ liệu dưới đây đều ghi hoặc xóa dữ liệu. Chỉ chạy trên database demo riêng, đã sao lưu. Không chạy trên database có dữ liệu thật.

Có ba cách, có thể dùng riêng hoặc kết hợp:

| Cách | Xóa dữ liệu? | Dùng khi |
| --- | --- | --- |
| [Seed khi khởi động](#1-seed-khi-khởi-động) | Xóa suất chiếu, đơn và vé của suất đã kết thúc hơn 30 ngày | Cần dữ liệu tối thiểu để đăng nhập và đặt vé |
| [`seed-data.ps1`](#2-reset-toàn-bộ-bằng-seed-dataps1) | Xóa sạch phần lớn bảng rồi tạo lại | Muốn đưa database demo về trạng thái ban đầu |
| [`demo-seed.mjs`](#3-bổ-sung-dữ-liệu-phong-phú-bằng-demo-seedmjs) | Không xóa, chỉ bổ sung | Cần nhiều phim, suất, đơn, hoàn tiền để thuyết trình hoặc báo cáo |

## Tài khoản demo

| Vai trò | Tài khoản | Mật khẩu | Chi nhánh | Tạo bởi |
| --- | --- | --- | --- | --- |
| ADMIN | `admin` | `admin@123` | Toàn hệ thống | Seed khởi động, cleanup |
| MANAGER | `manager` | `manager@123` | `CN-HCM-01` | Seed khởi động, cleanup |
| STAFF | `staff` | `staff@123` | `CN-HCM-01` | Seed khởi động, cleanup |
| USER | `user` | `user@123` | — | Seed khởi động, cleanup |
| USER | `user2` | `user2@123` | — | Seed khởi động, cleanup |
| MANAGER | `manager2`, `manager3`, `manager4` | `<tài khoản>@123` | `CN-HCM-02`, `CN-HN-01`, `CN-DN-01` | `demo-seed.mjs` |
| STAFF | `staff2` đến `staff7` | `<tài khoản>@123` | Rải ở bốn chi nhánh. `staff4` bị đặt INACTIVE để thử tài khoản ngừng hoạt động | `demo-seed.mjs` |

Bốn chi nhánh mẫu là `CN-HCM-01`, `CN-HCM-02`, `CN-HN-01` và `CN-DN-01`. Mật khẩu demo chỉ dùng cho database demo. Seed không đổi mật khẩu của tài khoản đã tồn tại.

## 1. Seed khi khởi động

Seed mặc định tắt. Runner `ApplicationInitConfig` và `DataSeeder` chỉ được đăng ký khi đủ ba điều kiện: profile `dev` đang bật, không có profile `prod`, và `app.demo.seed-enabled=true`.

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:APP_DEMO_SEED_ENABLED = "true"
.\mvnw.cmd spring-boot:run
```

Seed làm các việc sau, chạy lại nhiều lần không tạo trùng:

1. `DataSeedService.seedInitialData` tạo hoặc cập nhật tài khoản demo, bắp nước, thể loại, đạo diễn, phim, bốn chi nhánh, phòng, ghế và suất chiếu, rồi gán `manager` và `staff` vào chi nhánh đầu tiên.
2. `DataSeeder` xóa suất chiếu đã kết thúc hơn 30 ngày cùng đơn, vé và bắp nước của các suất đó, sinh suất chiếu từ hôm nay tới 14 ngày sau, rồi tạo một số đơn mẫu và đơn chờ hoàn tiền.

Khi dùng xong, gỡ biến để lần chạy sau không seed nữa:

```powershell
Remove-Item Env:APP_DEMO_SEED_ENABLED
```

## 2. Reset toàn bộ bằng `seed-data.ps1`

[seed-data.ps1](../../backend/seed-data.ps1) gọi `DELETE /v1/cleanup/database`, sau đó tạo lại dữ liệu qua REST API. API cleanup chỉ được đăng ký khi profile `dev` đang bật, không có `prod`, có `app.maintenance.cleanup-enabled=true`, và người gọi là ADMIN.

Bước 1, khởi động backend ở chế độ cho phép cleanup:

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:APP_MAINTENANCE_CLEANUP_ENABLED = "true"
.\mvnw.cmd spring-boot:run
```

Bước 2, ở terminal khác trong `backend/`:

```powershell
powershell -ExecutionPolicy Bypass -File .\seed-data.ps1
```

Script đăng nhập `admin`, gọi cleanup, đăng nhập lại rồi tạo thể loại, đạo diễn, chi nhánh, phòng, phim, suất chiếu và người dùng thử.

Phạm vi xóa của cleanup: lệnh `TRUNCATE` các bảng `payment_events`, `notification_reads`, `payments`, `booking_foods`, `tickets`, `bookings`, `showtimes`, `seats`, `rooms`, `branches`, `movie_ratings`, `movie_genres`, `movies`, `genres`, `foods`, `users`, rồi chạy lại `seedInitialData`. Các bảng `directors`, `promotions`, `notifications`, `audit_logs`, `system_settings` và `flyway_schema_history` được giữ nguyên. Redis không bị xóa, nên khóa giữ ghế cũ tự hết theo TTL.

Dùng xong, gỡ `APP_MAINTENANCE_CLEANUP_ENABLED` khỏi môi trường chạy.

## 3. Bổ sung dữ liệu phong phú bằng `demo-seed.mjs`

[demo-seed.mjs](../../backend/scripts/demo-seed.mjs) không xóa dữ liệu có sẵn. Mỗi bước kiểm tra dữ liệu đã có rồi mới tạo, nên chạy lại không tạo trùng.

- Danh mục, tài khoản, phòng, bắp nước, khuyến mãi, suất chiếu, đánh giá, yêu cầu và duyệt hoàn tiền, đơn chờ thanh toán đi qua REST API để backend tự kiểm tra nghiệp vụ.
- Đơn đã thanh toán được ghi trực tiếp bằng SQL. Nếu đi qua API, backend sẽ phát `BookingPaidEvent` và gửi email vé thật qua SMTP.

Yêu cầu: backend đang chạy, có MySQL client, mật khẩu database nằm trong `backend/.env`. Script dừng nếu thiếu cờ xác nhận.

```powershell
cd backend
node scripts/demo-seed.mjs --yes-demo-db
```

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `API_BASE` | `http://localhost:8081/api` | Địa chỉ backend |
| `MYSQL_BIN` | Tự tìm `mysql.exe` của MySQL 8.0/8.4, rồi `mysql` trong PATH | Đường dẫn MySQL client |
| `DEMO_SEED_CONFIRM=1` | — | Thay cho cờ `--yes-demo-db` |

Script đọc `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` từ `backend/.env` để biết database đích và in ra trước khi chạy.
