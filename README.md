# MoviePTIT — Hệ thống đặt vé xem phim

MoviePTIT là hệ thống đặt vé cho chuỗi rạp nhiều chi nhánh. Khách xem lịch chiếu, chọn ghế theo thời gian thực, mua bắp nước, thanh toán VNPay và nhận vé QR. Nhân viên bán vé tại quầy và soát vé. Quản lý chi nhánh và quản trị viên quản lý suất chiếu, hoàn tiền, khuyến mãi và báo cáo theo phạm vi được cấp.

<!-- Bỏ chú thích sau khi chụp ảnh theo docs/09-report/screenshots/README.md
![Chọn ghế](docs/09-report/screenshots/user-seat-select.png)
-->

| Phần | Công nghệ |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Axios, STOMP/SockJS |
| Backend | Java 21, Spring Boot 3.4, Spring Security (JWT, OAuth2 Google), JPA, Flyway |
| Dữ liệu | MySQL 8 (schema `cinema`), Redis (JWT, OTP, giữ ghế) |
| Tích hợp | VNPay sandbox, Gmail SMTP |

## Chạy nhanh

Cần JDK 21, Node 20.19+, MySQL 8 và Redis đang chạy ([yêu cầu chi tiết](docs/01-getting-started/requirements.md)).

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cinema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
foreach ($p in 'backend','frontend') { if (-not (Test-Path "$p/.env")) { Copy-Item "$p/.env.example" "$p/.env" } }   # rồi điền giá trị
cd backend; $env:SPRING_PROFILES_ACTIVE="dev"; $env:APP_DEMO_SEED_ENABLED="true"; .\mvnw.cmd spring-boot:run
cd frontend; npm ci; npm run dev     # ở terminal thứ hai
```

Mở `http://localhost:5173`, đăng nhập `admin` / `admin@123` hoặc `user` / `user@123`. Seed chỉ dùng cho database demo, bỏ hai biến `$env` ở lần chạy sau. Biến môi trường cần điền nằm trong [configuration.md](docs/01-getting-started/configuration.md), các bước đầy đủ trong [run-local.md](docs/01-getting-started/run-local.md).

## Tài liệu

Toàn bộ tài liệu nằm trong [docs/](docs/README.md), có lộ trình đọc cho thành viên mới, người làm frontend và giảng viên chấm.

| Cần gì | Đọc |
| --- | --- |
| Chạy dự án, dữ liệu demo, sửa lỗi | [01-getting-started](docs/01-getting-started/) |
| Nghiệp vụ, vai trò, vòng đời đơn | [02-domain](docs/02-domain/) |
| Kiến trúc, API, cơ sở dữ liệu | [03](docs/03-architecture/), [04](docs/04-api/), [05](docs/05-database/) |
| Quy ước code, Git, kiểm thử | [07-development](docs/07-development/) |
| Báo cáo môn TTCS | [09-report](docs/09-report/bao-cao.md) |

`backend/` và `frontend/` nằm ngay dưới gốc repo. Lệnh Maven chạy trong `backend/`, lệnh npm chạy trong `frontend/`.
