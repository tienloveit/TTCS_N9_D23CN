# MoviePTIT - Hệ thống đặt vé xem phim

Đây là dự án full-stack đặt vé xem phim, tên thư mục chính là `cinema-ticket`, giao diện hiển thị thương hiệu **MoviePTIT**. Dự án gồm backend Spring Boot, frontend React/Vite, MySQL, Redis, WebSocket realtime trạng thái ghế, thanh toán VNPay sandbox, gửi email và chatbot AI dùng Spring AI.

## 1. Dự án dùng để làm gì?

Ứng dụng hỗ trợ các luồng chính:

- Người dùng xem phim, rạp/chi nhánh, suất chiếu, chọn ghế, chọn đồ ăn, đặt vé và thanh toán VNPay.
- Người dùng đăng ký, đăng nhập, làm mới token, quên mật khẩu bằng OTP email, xem lịch sử đặt vé.
- Nhân viên đặt vé tại quầy, check-in vé bằng mã hoặc ảnh QR.
- Admin quản lý phim, suất chiếu, chi nhánh, phòng, người dùng, booking, đồ ăn, khuyến mãi và dashboard.
- Hệ thống giữ ghế realtime bằng Redis + WebSocket để nhiều người dùng không đặt trùng ghế.
- Dữ liệu demo được seed tự động khi backend khởi động.

## 2. Cấu trúc thư mục

```text
.
|-- README.md                       # Tài liệu tổng quan và hướng dẫn chạy dự án
`-- cinema-ticket/
    |-- codex.md                    # Ghi chú kỹ thuật chi tiết cho developer
    |-- backend/
    |   |-- pom.xml                 # Backend Spring Boot/Maven
    |   |-- seed-data.ps1           # Script reset + seed dữ liệu demo qua API
    |   `-- src/main/
    |       |-- java/com/ltweb/backend/
    |       |   |-- config/         # Security, JWT, Redis, WebSocket, VNPay, AI
    |       |   |-- controller/     # REST API
    |       |   |-- dto/            # Request/response payload
    |       |   |-- entity/         # JPA entity
    |       |   |-- enums/          # Enum trạng thái/loại dữ liệu
    |       |   |-- mapper/         # MapStruct mapper
    |       |   |-- repository/     # Spring Data repository
    |       |   |-- service/        # Business logic chính
    |       |   `-- job/            # Job dọn booking hết hạn
    |       `-- resources/
    |           `-- application.yaml
    `-- frontend/
        |-- package.json            # Frontend React/Vite
        |-- vite.config.js
        `-- src/
            |-- api/                # Axios client
            |-- components/
            |-- context/            # Auth context
            `-- pages/              # Trang public, user, staff, admin
```

## 3. Công nghệ chính

Backend:

- Java 21
- Spring Boot 3.4.0
- Spring Web MVC, Spring Data JPA/JDBC, Validation
- Spring Security OAuth2 Resource Server + JWT HS512 + Google OAuth2 Login
- MySQL
- Redis
- WebSocket/STOMP/SockJS
- MapStruct, Lombok
- Java Mail
- ZXing QR
- VNPay sandbox (Payment & Refund)
- Spring AI OpenAI starter, cấu hình gọi Gemini qua OpenAI-compatible API

Frontend:

- React 19
- Vite 8
- React Router 7
- Axios
- STOMP/SockJS client
- Framer Motion
- Recharts
- React Toastify

## 4. Yêu cầu cài đặt

Cần có sẵn trên máy:

- JDK 21
- Maven hoặc dùng Maven Wrapper trong `cinema-ticket/backend`
- Node.js và npm
- MySQL đang chạy ở `localhost:3306`
- Redis đang chạy ở `localhost:6379`

Database mặc định:

```text
Tên database: cinema
Username: root
Password: lấy từ biến SPRING_DATASOURCE_PASSWORD
```

Tạo database trước khi chạy backend:

```sql
CREATE DATABASE cinema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 5. Cấu hình môi trường

Backend đọc biến môi trường từ file `.env` nếu đặt ở một trong các vị trí được cấu hình trong `application.yaml`, cách đơn giản nhất là tạo file:

```text
cinema-ticket/backend/.env
```

Nội dung mẫu:

```properties
SPRING_DATASOURCE_PASSWORD=your_mysql_password

JWT_SECRET_KEY=your_very_long_jwt_secret_key

SPRING_MAIL_USERNAME=your_gmail@gmail.com
SPRING_MAIL_PASSWORD=your_gmail_app_password

VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_SECRET_KEY=your_vnpay_secret_key

GEMINI_API_KEY=your_gemini_api_key

GOOGLE_CLIENT_ID=google-client-id
GOOGLE_CLIENT_SECRET=google-client-secret
APP_OAUTH2_SUCCESS_URL=http://localhost:5173/oauth2/callback
APP_OAUTH2_FAILURE_URL=http://localhost:5173/login
```

Ghi chú:

- Không commit file `.env` hoặc secret thật lên Git.
- Nếu chưa dùng email, Google OAuth, VNPay hoặc AI, vẫn nên khai báo placeholder để ứng dụng không lỗi vì thiếu biến môi trường.
- Backend mặc định chạy ở `http://localhost:8081/api`.
- Frontend mặc định gọi API `http://localhost:8081/api`.

Frontend có thể tạo file:

```text
cinema-ticket/frontend/.env
```

Nội dung:

```properties
VITE_API_BASE_URL=http://localhost:8081/api
```

## 6. Cách chạy dự án

Mở 2 terminal riêng: một terminal cho backend, một terminal cho frontend.

### Bước 1: Chạy MySQL và Redis

Đảm bảo MySQL và Redis đang chạy trước. Nếu Redis không chạy, các chức năng token refresh/logout, OTP, giữ ghế realtime và chat memory có thể lỗi hoặc hoạt động không đầy đủ.

### Bước 2: Chạy backend

```powershell
cd cinema-ticket\backend
.\mvnw.cmd spring-boot:run
```

Nếu dùng Maven cài global:

```powershell
cd cinema-ticket\backend
mvn spring-boot:run
```

Backend chạy tại:

```text
http://localhost:8081/api
```

Kiểm tra nhanh:

```powershell
Invoke-RestMethod http://localhost:8081/api/movie/now-showing
```

### Bước 3: Chạy frontend

```powershell
cd cinema-ticket\frontend
npm install
npm run dev
```

Frontend chạy tại:

```text
http://localhost:5173
```

## 7. Tài khoản demo

Backend tự seed dữ liệu khi khởi động thông qua `DataSeedService`. Các tài khoản mặc định:

| Vai trò | Username | Password |
|---|---|---|
| Admin | `admin` | `admin@123` |
| Staff | `staff` | `staff@123` |
| User | `user` | `user@123` |
| User | `user2` | `user2@123` |

Nếu muốn reset database và tạo bộ dữ liệu demo qua API, chạy sau khi backend đã lên:

```powershell
cd cinema-ticket\backend
powershell -ExecutionPolicy Bypass -File .\seed-data.ps1
```

Script này sẽ gọi API cleanup, đăng nhập admin và tạo lại dữ liệu demo. Chỉ dùng khi chấp nhận xóa/reset dữ liệu hiện tại.

## 8. Các URL quan trọng trên frontend

Public/user:

- `/` - Trang chủ
- `/movies` - Danh sách phim
- `/movie/:id` - Chi tiết phim
- `/branches` - Danh sách chi nhánh
- `/branch/:branchId` - Chi tiết chi nhánh
- `/showtime/:showtimeId/seats` - Chọn ghế
- `/booking/:bookingId/payment` - Thanh toán booking
- `/payment/vnpay-return` - Kết quả VNPay
- `/profile` - Hồ sơ cá nhân
- `/my-bookings` - Vé/booking của tôi

Auth:

- `/login`
- `/register`
- `/forgot-password`
- `/oauth2/callback`

Staff:

- `/staff/booking` - Đặt vé tại quầy
- `/staff/check-in` - Check-in vé
- `/staff/bookings` - Quản lý booking

Admin:

- `/admin`
- `/admin/movies`
- `/admin/showtimes`
- `/admin/branches`
- `/admin/users`
- `/admin/bookings`
- `/admin/foods`
- `/admin/promotions`
- `/admin/analytics`
- `/admin/audit-logs`

## 9. API backend thường dùng

Tất cả endpoint bên dưới có prefix:

```text
http://localhost:8081/api
```

Auth:

- `POST /sign-up`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /my-info`
- `PUT /my-info`

Phim, rạp, suất chiếu:

- `GET /movie`
- `GET /movie/now-showing`
- `GET /movie/upcoming`
- `GET /movie/{id}`
- `GET /branch`
- `GET /branch/{id}`
- `GET /showtime`
- `GET /showtime/{id}`
- `GET /showtime/movie/{movieId}`
- `GET /showtime/branch/{branchId}?date=YYYY-MM-DD`
- `GET /ticket/showtime/{showtimeId}`

Booking/thanh toán:

- `POST /booking`
- `GET /booking/my-bookings/list`
- `GET /booking/my-bookings/{id}`
- `DELETE /booking/{id}`
- `POST /booking/staff`
- `POST /v1/vnpay/payment-url`
- `GET /v1/vnpay/return`
- `GET /v1/vnpay/ipn`
- `POST /v1/vnpay/refund`
- `GET /promotion`
- `POST /promotion/validate`

Staff/admin:

- `POST /ticket/check-in`
- `POST /ticket/check-in/qr-image`
- `GET /users`
- `POST /movie`, `PUT /movie/{id}`, `DELETE /movie/{id}`
- `POST /showtime`, `PUT /showtime/{id}`, `DELETE /showtime/{id}`
- `POST /branch`, `PUT /branch/{id}`, `DELETE /branch/{id}`
- `POST /food`, `PUT /food/{id}`, `DELETE /food/{id}`
- `/admin/analytics/**`
- `/reports/**`
- `/staff/**`

AI:

- `POST /chat`

## 10. Luồng nghiệp vụ chính

### Đặt vé online

1. User chọn suất chiếu và ghế trên frontend.
2. Frontend gọi `POST /booking`.
3. Backend kiểm tra vé còn trống, khóa ghế trong Redis 6 phút, chuyển ticket sang `HOLDING`.
4. Backend broadcast trạng thái ghế qua WebSocket topic `/topic/showtime/{showtimeId}/seats`.
5. User áp dụng mã khuyến mãi (nếu có) thông qua `POST /promotion/validate`.
6. Frontend gọi `POST /v1/vnpay/payment-url` để lấy URL thanh toán.
7. Sau khi VNPay trả kết quả, backend xác thực chữ ký.
8. Nếu thanh toán thành công, booking thành `COMPLETED`, payment thành `PAID`, ticket thành `BOOKED`, sinh QR và gửi email.
9. Nếu thanh toán lỗi/hủy/hết hạn, booking bị hủy và ghế được trả về `AVAILABLE`.

### Hoàn tiền (Refund)

1. Nếu vé bị hủy hoặc khách yêu cầu trả vé, Admin/Staff có thể thực hiện Refund.
2. Gọi API `POST /v1/vnpay/refund` để gửi yêu cầu hoàn tiền về hệ thống VNPay.
3. Trạng thái payment được cập nhật thành `REFUNDED` nếu thành công.

### Đặt vé tại quầy

1. Staff hoặc admin vào `/staff/booking`.
2. Gọi `POST /booking/staff`.
3. Nếu thanh toán tiền mặt, booking hoàn tất ngay, ticket thành `BOOKED`, sinh QR và gửi email.
4. Nếu chọn phương thức khác đang để `PENDING`, cần kiểm tra thêm luồng xử lý thanh toán tương ứng trước khi dùng thật.

### Check-in vé

Staff hoặc admin dùng:

- `POST /ticket/check-in` với mã vé, mã QR, booking code hoặc ticket id.
- `POST /ticket/check-in/qr-image` với ảnh QR.

Chỉ vé đã thanh toán, booking hoàn tất và ticket đang `BOOKED` mới check-in hợp lệ.

## 11. Realtime ghế

Frontend kết nối WebSocket tới:

```text
http://localhost:8081/api/ws
```

Topic theo dõi trạng thái ghế:

```text
/topic/showtime/{showtimeId}/seats
```

Các trạng thái chính:

- `AVAILABLE`: ghế còn trống
- `HOLDING`: ghế đang được giữ tạm thời
- `BOOKED`: ghế đã được đặt

Redis key giữ ghế có dạng:

```text
seat_hold:{showtimeId}:{seatId}
```

TTL mặc định là 6 phút.

## 12. Lệnh kiểm tra/build

Backend:

```powershell
cd cinema-ticket\backend
.\mvnw.cmd -q -DskipTests compile
.\mvnw.cmd -q -DskipTests package
```

Frontend:

```powershell
cd cinema-ticket\frontend
npm run lint
npm run build
```

Hiện dự án chưa có test backend trong `backend/src/test` và frontend chưa cấu hình test framework riêng; kiểm tra chính hiện tại là compile/package/lint/build.

## 13. Lưu ý khi đọc code

Thứ tự đọc dễ hiểu nhất cho backend:

```text
entity/ -> enums/ -> repository/ -> service/ -> controller/ -> dto/ -> config/
```

Khi tìm hiểu một chức năng cụ thể, nên đọc theo chiều:

```text
Controller -> Service -> Repository -> Entity/DTO
```

Một vài điểm cần nhớ:

- Backend có context path `/api`, nên controller viết `/movie` sẽ có URL thật là `/api/movie`.
- Quyền backend mới là nguồn kiểm soát chính; frontend route guard chỉ là trải nghiệm người dùng.
- Redis rất quan trọng cho refresh token, logout, OTP, giữ ghế và chat memory.
- Khi tạo showtime, backend tự tạo ticket cho toàn bộ ghế active của phòng.
- Khi sửa DTO hoặc response, cần kiểm tra cả mapper backend và nơi frontend đang dùng dữ liệu đó.
- Không sửa code sinh tự động của MapStruct trong thư mục build/target.

## 14. Lỗi thường gặp

`Access denied for user 'root'@'localhost'`

- Kiểm tra `SPRING_DATASOURCE_PASSWORD` trong `cinema-ticket/backend/.env`.
- Đảm bảo database `cinema` đã được tạo.

`Connection refused Redis`

- Redis chưa chạy ở `localhost:6379`.

Frontend gọi API bị CORS hoặc 404

- Kiểm tra backend có chạy ở `http://localhost:8081/api`.
- Kiểm tra `VITE_API_BASE_URL=http://localhost:8081/api`.
- Sau khi sửa `.env` frontend, cần restart `npm run dev`.

VNPay callback không đúng

- `vnpay.return-url` đang là `http://localhost:5173/payment/vnpay-return`.
- Khi đổi port frontend, cần đổi cấu hình VNPay tương ứng.

Không gửi được email OTP/vé

- Cần dùng Gmail App Password, không dùng mật khẩu Gmail thường.
- Kiểm tra `SPRING_MAIL_USERNAME` và `SPRING_MAIL_PASSWORD`.

AI chat lỗi API key/quota

- Kiểm tra `GEMINI_API_KEY`.
- Cấu hình model hiện tại là `gemini-2.5-flash` qua OpenAI-compatible base URL của Google.
