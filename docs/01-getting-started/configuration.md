# Cấu hình môi trường

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Backend đọc [application.yaml](../../backend/src/main/resources/application.yaml), sau đó nạp thêm file `.env` dạng `KEY=VALUE` nếu có, ở `./.env` hoặc `./backend/.env` tính từ thư mục chạy lệnh. Vì vậy chạy từ `backend/` hay từ gốc repo đều dùng được `backend/.env`. Biến môi trường của hệ điều hành ghi đè giá trị trong YAML. Frontend đọc `frontend/.env` khi Vite khởi động.

Tạo file cục bộ từ mẫu, chạy ở gốc repo:

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (-not (Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
```

`.env` đã nằm trong `.gitignore`. Chỉ commit `.env.example` với giá trị giả. Các biến đánh dấu **bí mật** không được đưa vào code, tài liệu, ảnh chụp hay tin nhắn nhóm.

## Backend (`backend/.env`)

| Biến | Bắt buộc | Bí mật | Mặc định / giá trị mẫu | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `SPRING_DATASOURCE_PASSWORD` | Có | Có | `your_mysql_password` | Mật khẩu MySQL. |
| `SPRING_DATASOURCE_USERNAME` | Không | | `root` | User MySQL. |
| `SPRING_DATASOURCE_URL` | Không | | `jdbc:mysql://localhost:3306/cinema` | Đổi host, cổng hoặc tên schema. |
| `SPRING_DATA_REDIS_HOST`, `SPRING_DATA_REDIS_PORT` | Không | | `localhost`, `6379` | Địa chỉ Redis. |
| `JWT_SECRET_KEY` | Có | Có | chuỗi ngẫu nhiên | Khóa ký JWT HS512, tối thiểu 64 byte. Đổi khóa làm mọi token cũ mất hiệu lực. |
| `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | Có | Mật khẩu là bí mật | `your_email@gmail.com` | Tài khoản Gmail SMTP và App Password. Xem [email.md](../06-integrations/email.md). |
| `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY` | Có | `VNPAY_SECRET_KEY` | mã sandbox | Mã merchant và khóa ký VNPay. Xem [vnpay.md](../06-integrations/vnpay.md). |
| `VNPAY_RETURN_URL` | Không | | `http://localhost:5173/payment/vnpay-return` | URL trình duyệt quay về sau khi thanh toán. Ghi đè `vnpay.return-url`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Khi dùng Google login | `GOOGLE_CLIENT_SECRET` | giá trị giả | OAuth client của Google. Xem [google-oauth.md](../06-integrations/google-oauth.md). |
| `APP_OAUTH2_SUCCESS_URL` | Không | | `http://localhost:5173/oauth2/callback` | Trang frontend nhận token sau khi đăng nhập Google. |
| `APP_OAUTH2_FAILURE_URL` | Không | | `http://localhost:5173/login` | Trang frontend nhận lỗi đăng nhập Google. |
| `SERVER_PORT` | Không | | `8081` | Cổng backend. Đổi thì cập nhật `VITE_API_BASE_URL`. |
| `APP_MOVIE_MEDIA_DIRECTORY` | Không | | `uploads/movies` | Thư mục lưu poster/banner upload, tính từ thư mục chạy backend. |
| `SPRING_PROFILES_ACTIVE` | Không | | trống | Đặt `dev` khi cần seed hoặc API cleanup. Profile `prod` chặn cả hai. |
| `APP_DEMO_SEED_ENABLED` | Không | | `false` | Bật seed lúc khởi động. Xem [demo-data.md](demo-data.md). |
| `APP_MAINTENANCE_CLEANUP_ENABLED` | Không | | `false` | Bật API xóa và tạo lại dữ liệu demo. Xem [demo-data.md](demo-data.md). |

Các biến không có giá trị mặc định trong YAML (`SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET_KEY`, `SPRING_MAIL_*`, `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY`) phải tồn tại, nếu không backend dừng khi khởi động với lỗi `Could not resolve placeholder`. Nếu chưa cần gửi mail hay thanh toán, điền giá trị giả để backend chạy được. Các luồng dùng dịch vụ đó sẽ báo lỗi khi được gọi.

Tạo `JWT_SECRET_KEY` bằng Node:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Biến chỉ dùng khi kiểm thử

| Biến | Ý nghĩa |
| --- | --- |
| `PAYMENT_TEST_DATABASE`, `PAYMENT_TEST_USER`, `PAYMENT_TEST_PASSWORD`, `PAYMENT_TEST_PORT` | Bật `PaymentPersistenceIntegrationTest` trên một database bản sao. Xem [testing.md](../07-development/testing.md). |
| `API_BASE`, `MYSQL_BIN`, `DEMO_SEED_CONFIRM` | Tham số của `backend/scripts/demo-seed.mjs`. Xem [demo-data.md](demo-data.md). |

## Frontend (`frontend/.env`)

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Không | `http://localhost:8081/api` | Base URL của REST API, đã gồm context path `/api`. SockJS cũng dùng `${VITE_API_BASE_URL}/ws`. |

Vite chỉ đọc `.env` lúc khởi động, nên khởi động lại `npm run dev` sau khi sửa. Mọi biến `VITE_*` được nhúng vào bundle và ai cũng đọc được, vì vậy không đặt bí mật ở frontend.

## Giá trị cố định trong `application.yaml`

Các giá trị sau không có biến riêng. Đổi bằng biến môi trường theo quy tắc relaxed binding của Spring (ví dụ `SPRING_MAIL_HOST`) hoặc sửa YAML.

| Khóa | Giá trị | Ghi chú |
| --- | --- | --- |
| `server.servlet.context-path` | `/api` | Mọi endpoint nằm dưới `/api`. |
| `spring.datasource.hikari.connection-init-sql` | `SET time_zone = '+07:00'` | Phiên MySQL dùng giờ rạp. |
| `spring.jpa.hibernate.ddl-auto` | `validate` | Schema do Flyway quản lý. Không đổi sang `update`. |
| `spring.jpa.open-in-view` | `false` | Xem [ADR-0004](../08-decisions/0004-disable-open-session-in-view.md). |
| `spring.mail.host`, `port` | `smtp.gmail.com`, `587` | STARTTLS bắt buộc, timeout 5 giây. |
| `spring.servlet.multipart` | file 5MB, request 6MB | Giới hạn upload poster và ảnh QR. |
| `vnpay.pay-url`, `vnpay.api-url` | URL sandbox VNPay | Đổi khi chuyển sang môi trường thật. |

Tham số nghiệp vụ như thời gian giữ ghế hay số vé tối đa không nằm trong YAML mà nằm trong bảng `system_settings`. Xem [tham số nghiệp vụ](../02-domain/overview.md#tham-số-nghiệp-vụ).
