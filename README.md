# MoviePTIT - Hệ thống đặt vé xem phim

Đây là dự án full-stack đặt vé xem phim, giao diện hiển thị thương hiệu **MoviePTIT**. Dự án gồm backend Spring Boot, frontend React/Vite, MySQL, Redis, WebSocket realtime trạng thái ghế, thanh toán VNPay sandbox và gửi email.

## 1. Dự án dùng để làm gì?

Ứng dụng hỗ trợ các luồng chính:

- Người dùng xem phim, rạp/chi nhánh, suất chiếu, chọn ghế, chọn đồ ăn, đặt vé và thanh toán VNPay.
- Người dùng đăng ký, đăng nhập, làm mới token, quên mật khẩu bằng OTP email, xem lịch sử đặt vé.
- Nhân viên đặt vé tại quầy, check-in vé bằng mã hoặc ảnh QR.
- Admin quản lý phim, suất chiếu, chi nhánh, phòng, người dùng, booking, đồ ăn, khuyến mãi và dashboard.
- Hệ thống giữ ghế realtime bằng Redis + WebSocket để nhiều người dùng không đặt trùng ghế.
- Seed demo mặc định tắt; chỉ chạy khi có profile `dev`, không có `prod`, và `APP_DEMO_SEED_ENABLED=true`.

## 2. Cấu trúc thư mục

```text
.
|-- README.md                       # Tài liệu tổng quan và hướng dẫn chạy dự án
|-- CLAUDE.md                      # Hướng dẫn và context toàn dự án
|-- backend/
|   |-- AGENTS.md
|   |-- pom.xml                 # Backend Spring Boot/Maven
|   |-- seed-data.ps1           # Script reset + seed dữ liệu demo qua API
|   `-- src/main/
|       |-- java/com/ltweb/backend/
|       |   |-- config/         # Security, JWT, Redis, WebSocket, VNPay
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
    |-- AGENTS.md
    |-- package.json            # Frontend React/Vite
    |-- vite.config.js
    `-- src/
        |-- api/                # Axios client
        |-- components/
        |-- context/            # Auth context
        `-- pages/              # Trang public, user, staff, admin
```

Mở thư mục gốc `TTCS_N9_D23CN` trong IDE để nạp cả `frontend/` và `backend/` cùng cấu hình của dự án.

Xem thêm [tài liệu backend](backend/AGENTS.md), [tài liệu frontend](frontend/AGENTS.md) và [context toàn dự án](CLAUDE.md).

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

- JDK 21. Kiểm tra bằng `java -version`.
- Node.js 20.19+ thuộc dòng 20, hoặc Node.js 22.12 trở lên. Kiểm tra bằng `node -v`. npm đi kèm Node.js.
- MySQL 8 chạy ở `localhost:3306` và Redis chạy ở `localhost:6379`.
- Git để lấy mã nguồn. Backend có sẵn Maven Wrapper trong `backend/`.

```powershell
git clone git@github.com:tienloveit/TTCS_N9_D23CN.git
cd TTCS_N9_D23CN
```

## 5. Cấu hình môi trường

Từ gốc repo, tạo file môi trường từ mẫu nếu chưa có file cục bộ.

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (-not (Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
```

| Biến trong `backend/.env` | Giá trị cần điền |
| --- | --- |
| `SPRING_DATASOURCE_PASSWORD` | Mật khẩu MySQL. Backend mặc định kết nối bằng user `root`. |
| `JWT_SECRET_KEY` | Chuỗi bí mật đủ dài cho JWT HS512, tối thiểu 64 byte. |
| `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | Tài khoản SMTP và mật khẩu ứng dụng nếu dùng Gmail. |
| `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY` | Mã website và khóa VNPay sandbox. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Thông tin Google OAuth2 nếu bật đăng nhập Google. Redirect URI là `http://localhost:8081/api/login/oauth2/code/google`. |

Với mail và VNPay chưa dùng ở môi trường local, có thể điền placeholder để backend nạp cấu hình. Giữ giá trị thật trong file `.env` cục bộ. Frontend dùng `VITE_API_BASE_URL=http://localhost:8081/api` theo mặc định.

## 6. Cách chạy dự án

### Bước 1. Khởi động MySQL và Redis

Chạy lệnh sau trong MySQL client nếu chưa có database `cinema`.

```sql
CREATE DATABASE cinema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Backend dùng `ddl-auto: update` để tạo bảng khi chạy với database mới. Nếu đang dùng database từ phiên bản cũ, đọc phần [Migration cho database cũ](#15-migration-cho-database-cũ) trước khi bật backend. Có thể nạp dữ liệu phim mẫu bằng cách mở [`backend/movie.sql`](backend/movie.sql) trong MySQL Workbench và chạy trên database demo.

Nếu đã cài Docker và chưa có Redis đang nghe cổng 6379, chạy:

```powershell
docker run -d --name movieptit-redis -p 127.0.0.1:6379:6379 redis:7
docker exec movieptit-redis redis-cli ping
```

Redis trả `PONG` khi sẵn sàng. Nếu đã cài Redis trực tiếp, khởi động dịch vụ Redis và chạy `redis-cli ping`.

### Bước 2. Chạy backend

Mở terminal ở gốc repo. Trên Windows PowerShell, chạy:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Trên Linux hoặc macOS, chạy:

```bash
cd backend
sh ./mvnw spring-boot:run
```

Backend sẵn sàng khi log có dòng `Started BackendApplication`. Kiểm tra REST API từ terminal khác.

```powershell
Invoke-RestMethod http://localhost:8081/api/movie/now-showing
```

### Bước 3. Chạy frontend

Mở một terminal khác ở gốc repo.

```powershell
cd frontend
npm ci
npm run dev
```

Mở `http://localhost:5173` sau khi Vite báo sẵn sàng. Chạy `npm run build` trong `frontend/` để tạo bản production tại `frontend/dist/`.

## 7. Tài khoản demo

Để tạo dữ liệu demo khi khởi động, chỉ dùng database demo riêng và chạy backend với cấu hình sau:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:APP_DEMO_SEED_ENABLED = "true"
mvn spring-boot:run
```

Chạy từ thư mục `backend`. Seed mặc định tắt và luôn bị chặn khi profile `prod` hoạt động. Chế độ demo có thể cập nhật tài khoản mẫu và xóa lịch sử đặt vé/suất chiếu cũ hơn 30 ngày. Gỡ biến `APP_DEMO_SEED_ENABLED` sau khi dùng. Các tài khoản được tạo khi bật seed:

| Vai trò | Username | Password |
|---|---|---|
| Admin | `admin` | `admin@123` |
| Staff | `staff` | `staff@123` |
| User | `user` | `user@123` |
| User | `user2` | `user2@123` |

Nếu muốn reset database và tạo bộ dữ liệu demo qua API, backend phải chạy với profile `dev` (không có `prod`) và `app.maintenance.cleanup-enabled=true`. API này mặc định tắt và yêu cầu ADMIN. Xem cách bật trong [tài liệu backend](backend/AGENTS.md). Sau khi backend đã lên:

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\seed-data.ps1
```

Script này đăng nhập admin, gọi API cleanup, đăng nhập lại và tạo dữ liệu demo. Chỉ dùng khi chấp nhận xóa/reset dữ liệu hiện tại.

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
cd backend
.\mvnw.cmd -q -DskipTests compile
.\mvnw.cmd -q -DskipTests package
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

Chạy test backend từ `backend/` bằng `.\mvnw.cmd test` và test frontend từ `frontend/` bằng `node --experimental-vm-modules --test tests/*.test.mjs`.

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
- Redis rất quan trọng cho refresh token, logout, OTP và giữ ghế.
- Khi tạo showtime, backend tự tạo ticket cho toàn bộ ghế active của phòng.
- Khi sửa DTO hoặc response, cần kiểm tra cả mapper backend và nơi frontend đang dùng dữ liệu đó.
- Không sửa code sinh tự động của MapStruct trong thư mục build/target.

## 14. Lỗi thường gặp

`Access denied for user 'root'@'localhost'`

- Kiểm tra `SPRING_DATASOURCE_PASSWORD` trong `backend/.env`.
- Đảm bảo database `cinema` đã được tạo.

`invalid target release: 21`

- Kiểm tra `java -version` và đặt `JAVA_HOME` trỏ tới JDK 21.

Cổng `8081` đã được sử dụng

- Dừng tiến trình đang dùng cổng hoặc đổi `server.port` và cập nhật `VITE_API_BASE_URL` tương ứng.

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

## 15. Migration cho database cũ

Khóa chính đơn của các bảng hiện được đặt tên là `id`. Nếu database đang dùng
các tên như `branch_id`, `movie_id`, `booking_id`, hãy dừng backend, sao lưu
database rồi chạy migration **trước khi khởi động backend mới**:

```sql
SOURCE backend/migrations/20261111_primary_keys_to_id.sql;
```

Mở MySQL client từ gốc repo để chạy lệnh trên hoặc mở file SQL trong MySQL Workbench.
Migration dùng MySQL 8, giữ nguyên giá trị khóa, dữ liệu, AUTO_INCREMENT và cập
nhật đích tham chiếu của khóa ngoại. Có thể chạy lại khi các khóa đã mang tên
`id`. Các cột khóa ngoại như `rooms.branch_id` và khóa chính ghép của
`movie_genres` vẫn giữ tên theo quan hệ. `ddl-auto: update` không tự đổi tên
cột cũ; không dùng nó để thay cho migration này.

Để cập nhật ràng buộc chi nhánh/phòng và thêm thời gian tạo, cập nhật cho chi
nhánh, chạy tiếp `backend/migrations/20261111_branch_room_constraints.sql`
khi backend đã dừng. Mã phòng giới hạn 50 ký tự. Với chi nhánh cũ chưa có dữ
liệu thời gian, `created_at` và `updated_at` được khởi tạo tại lúc migration.

Thay đổi công nghệ phòng và định dạng suất chiếu dùng migration
`backend/migrations/20261111_screening_format_room_technology.sql`.
Chạy khi backend đã dừng và sau khi sao lưu. `rooms.room_technology` gồm
`STANDARD`, `IMAX`, `FOUR_DX`, `SCREEN_X`, `GOLD_CLASS`;
`showtimes.screening_format` gồm `TWO_D` (2D), `THREE_D` (3D).
Phòng 2D/3D cũ chuyển thành `STANDARD`, suất chiếu cũ của phòng 3D giữ định
dạng 3D. IMAX/4DX không cho biết định dạng cũ là 2D hay 3D, nên suất chiếu
của các phòng này khởi tạo là 2D và có thể chỉnh tại form suất chiếu.

Ràng buộc ghế dùng migration
`backend/migrations/20261111_seat_constraints.sql` (dừng backend
và sao lưu trước khi chạy). `seat_code` không nhận NULL; `seat_type` không
nhận NULL và mặc định `STANDARD`. Cột `is_active` được bỏ. Ngoài mã ghế duy
nhất trong phòng, vị trí `(room_id, row_label, seat_number)` cũng phải duy
nhất. Migration dừng nếu dữ liệu có mã ghế thiếu hoặc vị trí trùng để có thể
xử lý thủ công thay vì xóa dữ liệu.

Trạng thái phim chỉ còn `UPCOMING`, `NOW_SHOWING`, `ENDED`. Database cũ dùng
migration `backend/migrations/20261111_remove_movie_inactive.sql`.
Nếu còn phim `INACTIVE`, phải chọn trạng thái mới cho các phim đó trước khi
chạy; migration không tự gán trạng thái khác.

Đổi cột công khai phim từ `published` sang `is_public` dùng migration
`backend/migrations/20261111_movie_is_public.sql` khi backend
đã dừng và database đã được sao lưu. API và frontend dùng trường `isPublic`.
Giá trị công khai/bản nháp hiện có được giữ nguyên.

Migration `backend/migrations/20261111_movie_timestamps_director_names.sql`
thêm `movies.created_at`, `movies.updated_at` tự động và cho phép đạo diễn
trùng tên (bỏ UNIQUE trên `directors.name`, giữ index thường để tìm kiếm).
Dừng backend và sao lưu trước khi chạy. Thời gian của phim cũ chưa được lưu
trước đây sẽ được khởi tạo tại lúc migration.

Migration `backend/migrations/20261111_movie_rating_timestamps_not_null.sql`
đặt `movie_ratings.created_at` và `updated_at` thành `DATETIME(6) NOT NULL`.
Giá trị thời gian đã có được giữ nguyên; giá trị NULL lấy từ cột thời gian
còn lại hoặc thời điểm migration nếu cả hai đều chưa có.

Migration `backend/migrations/20261111_showtime_time_constraints.sql`
bắt buộc thời gian bắt đầu/kết thúc suất chiếu và thêm CHECK
`end_time > start_time`. Nếu lịch cũ có NULL hoặc kết thúc không sau bắt đầu,
cần sửa dữ liệu trước khi chạy migration; các lịch hợp lệ được giữ nguyên.

Migration `backend/migrations/20261111_showtime_status_not_null.sql`
bắt buộc `showtimes.status` (`OPEN`, `CLOSED`, `CANCELLED`). Nếu dữ liệu cũ
có trạng thái NULL, cần gán trạng thái phù hợp trước khi chạy migration.

Migration `backend/migrations/20261111_ticket_checked_in_by.sql`
thêm `tickets.checked_in_by` tham chiếu `users.id`. Backend tự ghi tài khoản
thực hiện check-in; API trả `checkedInBy` và `checkedInByName`. Quét lại vé
giữ nguyên người/thời điểm check-in đầu tiên. Vé cũ không rõ người check-in
và vé chưa check-in để NULL.

Migration `backend/migrations/20261111_extract_booking_payments.sql`
tách thông tin thanh toán và hoàn tiền từ `bookings` sang bảng `payments`.
Mỗi booking có một payment, liên kết bằng `payments.booking_id` (NOT NULL,
UNIQUE, khóa ngoại tới `bookings.id`). Bảng mới lưu số tiền thanh toán,
phương thức, trạng thái, mã giao dịch và thông tin hoàn tiền; `created_at`,
`updated_at` tự động được MySQL ghi. Booking giữ tổng tiền đơn, khuyến mãi,
khách hàng, nhân viên đặt vé và suất chiếu. API booking vẫn trả các trường
thanh toán như trước để giao diện hiện tại tiếp tục hoạt động.

Dừng backend và sao lưu database trước khi chạy migration này. Migration
chuyển và đối chiếu dữ liệu trước khi xóa 11 cột cũ; nếu dữ liệu đã có trong
`payments` không khớp, migration dừng và giữ các cột nguồn. Có thể chạy lại.
Đây là quan hệ một-một theo nghiệp vụ hiện tại, chưa lưu nhiều lần thử
thanh toán cho cùng một booking. Khi tạo database mới, dùng `movie.sql`
đã có sẵn bảng `payments`.

Kiểm thử `PaymentPersistenceIntegrationTest` chỉ chạy khi biến môi trường
`PAYMENT_TEST_DATABASE` là tên database bản sao dạng
`cinema_payment_test_YYYYMMDDHHMMSS`, cùng `PAYMENT_TEST_USER` và
`PAYMENT_TEST_PASSWORD`. Bản sao phải được chạy migration trước; kiểm thử
xác thực schema và lưu/cập nhật/xóa booking kèm payment trong transaction
rollback. Không dùng database chính để chạy kiểm thử này.

Migration `backend/migrations/20261111_booking_booked_staff.sql`
đổi cột `bookings.staff_user_id` thành `booked_staff`, giữ nguyên dữ liệu,
chỉ mục và khóa ngoại tới `users.id`. Dừng backend và sao lưu trước khi chạy.

Migration `backend/migrations/20261111_ticket_status_booking_code_not_null.sql`
bắt buộc `tickets.ticket_status` và `bookings.booking_code`. Giữ UNIQUE của
mã đặt vé; dữ liệu NULL cần được sửa trước khi chạy migration.
