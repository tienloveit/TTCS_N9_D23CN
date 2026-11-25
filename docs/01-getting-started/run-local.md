# Chạy dự án ở máy local

> Đối chiếu mã nguồn ngày 2026-11-25, nhánh `fix/backend-review-cleanup` (tách từ commit `7105c25`).

Thứ tự: MySQL → Redis → backend → frontend. Trước khi bắt đầu, cài đủ phần mềm theo [requirements.md](requirements.md) và tạo `.env` theo [configuration.md](configuration.md).

```powershell
git clone git@github.com:tienloveit/TTCS_N9_D23CN.git
cd TTCS_N9_D23CN
```

## 1. Tạo schema MySQL

```sql
CREATE DATABASE IF NOT EXISTS cinema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Không cần tạo bảng. Khi backend khởi động, Flyway chạy các migration trong [db/migration](../../backend/src/main/resources/db/migration) để tạo hoặc nâng cấp schema, rồi Hibernate kiểm tra entity khớp schema. Nếu dùng database có từ trước khi dự án dùng Flyway, đọc [migrations.md](../05-database/migrations.md#database-có-từ-trước) trước khi khởi động.

## 2. Bật Redis

```powershell
redis-cli ping
```

Redis sẵn sàng khi trả `PONG`. Nếu chưa có Redis, xem [cách chạy bằng Docker](requirements.md#dùng-docker-cho-mysql-và-redis).

## 3. Chạy backend (cổng 8081)

Windows:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Linux/macOS: `cd backend && sh ./mvnw spring-boot:run`.

Backend sẵn sàng khi log có `Started BackendApplication`. Ở lần đầu trên database rỗng, log có thêm dòng Flyway áp dụng V1 đến V7. Kiểm tra một API công khai:

```powershell
Invoke-RestMethod http://localhost:8081/api/movie/now-showing
```

Kết quả là JSON có `code: 200` và mảng `result`. Database mới tạo chưa có phim nên `result` rỗng. Nạp dữ liệu mẫu theo [demo-data.md](demo-data.md).

## 4. Chạy frontend (cổng 5173)

Mở terminal khác ở gốc repo:

```powershell
cd frontend
npm ci
npm run dev
```

Mở URL Vite in ra, mặc định `http://localhost:5173`. Nếu cổng 5173 bận, Vite tự chọn 5174. Mặc định backend chỉ cho phép CORS từ các cổng 5173, 5174 và 3000. Dùng cổng khác thì thêm origin vào `APP_CORS_ALLOWED_ORIGINS` (xem [configuration.md](configuration.md)).

## 5. Xác nhận hệ thống chạy đúng

| Kiểm tra | Cách làm | Kết quả đúng |
| --- | --- | --- |
| Trang chủ | Mở `http://localhost:5173` | Trang chủ hiện, không có lỗi CORS trong DevTools. |
| Đăng nhập | Đăng nhập tài khoản demo ở [demo-data.md](demo-data.md) | ADMIN về `/admin`, MANAGER về `/manager`, STAFF về `/staff/dashboard`. USER quay lại trang đang xem trước khi đăng nhập, hoặc trang chủ. |
| Realtime | Mở cùng một màn chọn ghế ở hai tab, đặt ghế ở tab thứ nhất | Tab thứ hai thấy ghế đổi trạng thái mà không cần tải lại. |
| Redis | `redis-cli keys "seat_hold:*"` sau khi tạo đơn | Có key giữ ghế với TTL khoảng 6 phút. |

## Lệnh build

| Mục đích | Lệnh |
| --- | --- |
| Đóng gói backend | `.\mvnw.cmd -DskipTests package` trong `backend/`, tạo `target/backend-0.0.1-SNAPSHOT.jar` |
| Build frontend | `npm run build` trong `frontend/`, tạo `frontend/dist/` |
| Xem bản build frontend | `npm run preview` |

Lệnh kiểm thử nằm ở [testing.md](../07-development/testing.md). Gặp lỗi thì xem [troubleshooting.md](troubleshooting.md).
