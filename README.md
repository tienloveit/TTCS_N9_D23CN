# MoviePTIT — Hệ thống đặt vé xem phim

MoviePTIT phục vụ đặt vé online, bán vé tại quầy và quản trị rạp. Khách có thể tra cứu lịch chiếu, chọn ghế, mua bắp nước, thanh toán VNPay sandbox và xem vé QR. Nhân viên bán vé và check-in. Quản lý chi nhánh và quản trị viên theo dõi đơn, hoàn tiền, doanh thu và vận hành theo phạm vi được cấp.

## Cấu trúc và tài liệu

| Nơi đọc | Nội dung |
| --- | --- |
| [Context toàn dự án](CLAUDE.md) | Kiến trúc, vai trò, luồng liên tầng và các hợp đồng dữ liệu |
| [Backend](backend/CLAUDE.md) | Java 21, Spring Boot 3.4.0, REST API, MySQL, Redis, WebSocket, OAuth2, VNPay, SMTP và migration |
| [Frontend](frontend/CLAUDE.md) | React 19, Vite 8, React Router 7, Axios, route theo vai trò và các màn hình |
| [Hướng dẫn AI](AGENTS.md) | Quy tắc GitNexus và các hướng dẫn theo phạm vi |

`backend/src/main/` chứa mã Java và cấu hình runtime, `backend/src/test/` chứa kiểm thử. `frontend/src/` chứa ứng dụng React, `frontend/tests/` chứa kiểm thử Node. Mở gốc `TTCS_N9_D23CN` trong IDE để làm việc với cả hai phần.

## Yêu cầu

- JDK 21 (`java -version`). Backend có sẵn Maven Wrapper.
- Node.js 20.19+ thuộc dòng 20 hoặc 22.12 trở lên (`node -v`), kèm npm.
- MySQL 8 ở `localhost:3306` và Redis ở `localhost:6379` theo cấu hình mặc định.
- Git. Maven Spotless dựa trên một commit baseline, vì vậy checkout chạy build cần có commit này trong lịch sử.

```powershell
git clone git@github.com:tienloveit/TTCS_N9_D23CN.git
cd TTCS_N9_D23CN
```

## Cấu hình môi trường

Tạo cấu hình cục bộ từ mẫu ở gốc repo.

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (-not (Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
```

| Biến | Cấu hình |
| --- | --- |
| `SPRING_DATASOURCE_PASSWORD` | Mật khẩu database. Mặc định user `root` kết nối schema `cinema`. Có thể ghi đè `SPRING_DATASOURCE_USERNAME` và `SPRING_DATASOURCE_URL`. |
| `JWT_SECRET_KEY` | Khóa bí mật ngẫu nhiên tối thiểu 64 byte cho HS512. |
| `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | Tài khoản SMTP và mật khẩu ứng dụng nếu dùng Gmail. |
| `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY` | Thông tin merchant VNPay sandbox. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Điền khi dùng Google login. Redirect URI đăng ký ở phía Google là `http://localhost:8081/api/login/oauth2/code/google`. |
| `APP_OAUTH2_SUCCESS_URL`, `APP_OAUTH2_FAILURE_URL` | Điểm đến frontend sau OAuth2. Mặc định là `/oauth2/callback` và `/login` tại `http://localhost:5173`. |
| `VITE_API_BASE_URL` | Base URL của frontend, mặc định `http://localhost:8081/api`. |

Mail và VNPay có thể dùng placeholder để nạp cấu hình local nếu chưa cần gọi các dịch vụ đó. Giữ thông tin thật trong `.env` cục bộ. Xem [application.yaml](backend/src/main/resources/application.yaml) và hai tệp mẫu [backend](backend/.env.example), [frontend](frontend/.env.example).

## Cách chạy dự án

### 1. Chuẩn bị MySQL và Redis

Trong MySQL client, tạo database mới.

```sql
CREATE DATABASE IF NOT EXISTS cinema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Mặc định Hibernate dùng `ddl-auto: update`. [movie.sql](backend/movie.sql) là schema khởi tạo tùy chọn cho các bảng chính. Dữ liệu mẫu được tạo qua chế độ demo. Nếu dùng database cũ, xem [migration cho database cũ](#migration-cho-database-cũ) trước khi khởi động backend.

Kiểm tra Redis bằng `redis-cli ping`. Nếu dùng Docker và chưa có Redis nghe ở cổng 6379, có thể chạy:

```powershell
docker run -d --name movieptit-redis -p 127.0.0.1:6379:6379 redis:7
docker exec movieptit-redis redis-cli ping
```

Redis sẵn sàng khi trả `PONG`.

### 2. Chạy backend

Từ gốc repo trên Windows:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Trên Linux/macOS, chạy `sh ./mvnw spring-boot:run` từ `backend/`. Sau khi log báo `Started BackendApplication`, kiểm tra API công khai.

```powershell
Invoke-RestMethod http://localhost:8081/api/movie/now-showing
```

### 3. Chạy frontend

Mở terminal khác ở gốc repo.

```powershell
cd frontend
npm ci
npm run dev
```

Mở URL Vite báo trong terminal, mặc định là `http://localhost:5173`. Frontend gọi trực tiếp backend. SockJS dùng `${VITE_API_BASE_URL}/ws` và STOMP dùng `/topic/showtime/{showtimeId}/seats`.

## Dữ liệu demo

Seed lúc khởi động mặc định tắt. Trên database demo riêng, chạy từ `backend/`:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:APP_DEMO_SEED_ENABLED = "true"
.\mvnw.cmd spring-boot:run
```

Profile `prod` chặn seed. Chế độ này cập nhật dữ liệu mẫu và có thể dọn lịch sử đặt vé/suất chiếu cũ hơn 30 ngày. Khi dùng xong, bỏ `APP_DEMO_SEED_ENABLED` khỏi môi trường chạy.

| Vai trò | Tài khoản demo | Mật khẩu demo |
| --- | --- | --- |
| Admin | `admin` | `admin@123` |
| Manager | `manager` | `manager@123` |
| Staff | `staff` | `staff@123` |
| User | `user` | `user@123` |
| User | `user2` | `user2@123` |

[seed-data.ps1](backend/seed-data.ps1) là luồng reset và tạo lại dữ liệu qua API. Script yêu cầu ADMIN và API cleanup được bật bằng profile `dev` cùng `APP_MAINTENANCE_CLEANUP_ENABLED=true`. Chỉ chạy script trên database demo có thể reset. Xem [điều kiện cleanup](backend/CLAUDE.md#runtime-và-cấu-hình).

Khi backend demo đã chạy với API cleanup, gọi script từ `backend/` trên Windows.

```powershell
powershell -ExecutionPolicy Bypass -File .\seed-data.ps1
```

## Đường dẫn chính

| Người dùng | Đường dẫn |
| --- | --- |
| Công khai | `/`, `/movies`, `/movie/:id`, `/branches`, `/branch/:branchId`, `/showtime/:showtimeId/seats` |
| Tài khoản | `/login`, `/register`, `/forgot-password`, `/profile`, `/my-bookings` |
| Thanh toán | `/booking/:bookingId/payment`, `/payment/vnpay-return` |
| Nhân viên | `/staff/dashboard`, `/staff/booking`, `/staff/check-in`, `/staff/bookings`, `/staff/notifications` |
| Quản lý và quản trị viên | `/manager`, `/admin` |

Xem [route và quyền giao diện](frontend/CLAUDE.md#route-và-quyền-giao-diện) và [API backend](backend/CLAUDE.md#vận-hành-và-api-chính) để tìm endpoint và phạm vi truy cập.

## Kiểm tra và build

Từ `backend/` trên Windows:

```powershell
.\mvnw.cmd test
.\mvnw.cmd -DskipTests package
```

Từ `frontend/`:

```powershell
npm run lint
npm run build
node --experimental-vm-modules --test tests/*.test.mjs
```

Build frontend tạo `frontend/dist/`. Kiểm thử persistence backend cần MySQL bản sao đã chạy migration. Xem [điều kiện kiểm thử](backend/CLAUDE.md#migration-và-kiểm-tra).

## Migration cho database cũ

Dừng backend, sao lưu database và đối chiếu schema đang dùng với [bảng migration và thứ tự phụ thuộc](backend/CLAUDE.md#thứ-tự-theo-schema-đang-dùng). Các script trong [backend/migrations](backend/migrations) được chạy thủ công theo trạng thái schema. Ví dụ database còn khóa chính `branch_id`, `movie_id`, `booking_id` cần script đổi PK sang `id` trước các migration tham chiếu tên mới. Hibernate `ddl-auto: update` không tự chuyển đổi dữ liệu và quan hệ theo các script đó.

## Xử lý lỗi khi chạy local

| Hiện tượng | Kiểm tra |
| --- | --- |
| MySQL từ chối xác thực | Schema `cinema`, username và `SPRING_DATASOURCE_PASSWORD`. |
| `invalid target release: 21` | `java -version` và `JAVA_HOME` trỏ tới JDK 21. |
| Redis connection refused | Kiểm tra dịch vụ cổng 6379 và `redis-cli ping`. |
| Cổng 8081 đã dùng | Kiểm tra tiến trình hiện tại hoặc đổi `SERVER_PORT` cùng `VITE_API_BASE_URL`. |
| API 404 hoặc lỗi CORS | Kiểm tra hậu tố `/api`, origin frontend trong `SecurityConfig` và khởi động lại Vite sau khi sửa `.env`. |
| VNPay/OAuth2 quay về sai URL | Cập nhật `vnpay.return-url` hoặc `APP_OAUTH2_*_URL` khi đổi địa chỉ frontend, cùng redirect URI Google khi đổi địa chỉ backend. |
| Email OTP/vé không gửi | Kiểm tra SMTP, mật khẩu ứng dụng và quyền gửi của tài khoản. |
