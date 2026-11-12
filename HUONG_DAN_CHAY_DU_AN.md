# Hướng dẫn chạy dự án Cinema Ticket

Dự án gồm 2 phần nằm trong thư mục `cinema-ticket/`:

| Phần | Công nghệ | Cổng | Thư mục |
|------|-----------|------|---------|
| Backend | Spring Boot 3.4.0, Java 21, Maven | `8081` (context path `/api`) | `cinema-ticket/backend` |
| Frontend | React 19 + Vite | `5173` | `cinema-ticket/frontend` |

Hạ tầng cần có: **MySQL** (cổng 3306) và **Redis** (cổng 6379).

---

## 1. Yêu cầu cài đặt

| Phần mềm | Phiên bản | Kiểm tra |
|----------|-----------|----------|
| JDK | 21 | `java -version` |
| Node.js | 18+ (khuyến nghị 20+) | `node -v` |
| npm | đi kèm Node.js | `npm -v` |
| MySQL | 8.x | `mysql --version` |
| Redis | 6+ (trên Windows dùng Memurai hoặc Docker) | `redis-cli ping` → `PONG` |
| Git | bất kỳ | `git --version` |

> Maven **không cần cài riêng**, dự án đã có Maven Wrapper (`mvnw`, `mvnw.cmd`).

---

## 2. Lấy mã nguồn

```powershell
git clone git@github.com:tienloveit/TTCS_N9_D23CN.git
cd TTCS_N9_D23CN
```

---

## 3. Chuẩn bị cơ sở dữ liệu MySQL

1. Khởi động MySQL, đăng nhập bằng user `root`.
2. Tạo database tên `cinema`:

   ```sql
   CREATE DATABASE cinema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. Backend dùng `ddl-auto: update` nên **bảng sẽ tự được tạo** khi chạy lần đầu.
4. (Tùy chọn) Có sẵn file `cinema-ticket/backend/movie.sql`. Có thể import nếu muốn có dữ liệu phim mẫu:

   ```powershell
   mysql -u root -p cinema < cinema-ticket/backend/movie.sql
   ```

> Kết nối mặc định: `jdbc:mysql://localhost:3306/cinema`, user `root`.
> Nếu cần đổi, sửa trong `cinema-ticket/backend/src/main/resources/application.yaml`.

### Database đã có từ phiên bản cũ

Khóa chính đơn của các bảng hiện được đặt tên là `id`. Nếu database đang dùng
các tên như `branch_id`, `movie_id`, `booking_id`, hãy dừng backend, sao lưu
database rồi chạy migration **trước khi khởi động backend mới**:

```sql
SOURCE D:/Projects/TTCS_N9_D23CN/cinema-ticket/backend/migrations/20261111_primary_keys_to_id.sql;
```

Chạy lệnh trên trong MySQL client hoặc mở file SQL trong MySQL Workbench.
Migration dùng MySQL 8, giữ nguyên giá trị khóa, dữ liệu, AUTO_INCREMENT và cập
nhật đích tham chiếu của khóa ngoại. Có thể chạy lại khi các khóa đã mang tên
`id`. Các cột khóa ngoại như `rooms.branch_id` và khóa chính ghép của
`movie_genres` vẫn giữ tên theo quan hệ. `ddl-auto: update` không tự đổi tên
cột cũ; không dùng nó để thay cho migration này.

Để cập nhật ràng buộc chi nhánh/phòng và thêm thời gian tạo, cập nhật cho chi
nhánh, chạy tiếp `cinema-ticket/backend/migrations/20261111_branch_room_constraints.sql`
khi backend đã dừng. Mã phòng giới hạn 50 ký tự. Với chi nhánh cũ chưa có dữ
liệu thời gian, `created_at` và `updated_at` được khởi tạo tại lúc migration.

Thay đổi công nghệ phòng và định dạng suất chiếu dùng migration
`cinema-ticket/backend/migrations/20261111_screening_format_room_technology.sql`.
Chạy khi backend đã dừng và sau khi sao lưu. `rooms.room_technology` gồm
`STANDARD`, `IMAX`, `FOUR_DX`, `SCREEN_X`, `GOLD_CLASS`;
`showtimes.screening_format` gồm `TWO_D` (2D), `THREE_D` (3D).
Phòng 2D/3D cũ chuyển thành `STANDARD`, suất chiếu cũ của phòng 3D giữ định
dạng 3D. IMAX/4DX không cho biết định dạng cũ là 2D hay 3D, nên suất chiếu
của các phòng này khởi tạo là 2D và có thể chỉnh tại form suất chiếu.

Ràng buộc ghế dùng migration
`cinema-ticket/backend/migrations/20261111_seat_constraints.sql` (dừng backend
và sao lưu trước khi chạy). `seat_code` không nhận NULL; `seat_type` không
nhận NULL và mặc định `STANDARD`. Cột `is_active` được bỏ. Ngoài mã ghế duy
nhất trong phòng, vị trí `(room_id, row_label, seat_number)` cũng phải duy
nhất. Migration dừng nếu dữ liệu có mã ghế thiếu hoặc vị trí trùng để có thể
xử lý thủ công thay vì xóa dữ liệu.

Trạng thái phim chỉ còn `UPCOMING`, `NOW_SHOWING`, `ENDED`. Database cũ dùng
migration `cinema-ticket/backend/migrations/20261111_remove_movie_inactive.sql`.
Nếu còn phim `INACTIVE`, phải chọn trạng thái mới cho các phim đó trước khi
chạy; migration không tự gán trạng thái khác.

Đổi cột công khai phim từ `published` sang `is_public` dùng migration
`cinema-ticket/backend/migrations/20261111_movie_is_public.sql` khi backend
đã dừng và database đã được sao lưu. API và frontend dùng trường `isPublic`.
Giá trị công khai/bản nháp hiện có được giữ nguyên.

Migration `cinema-ticket/backend/migrations/20261111_movie_timestamps_director_names.sql`
thêm `movies.created_at`, `movies.updated_at` tự động và cho phép đạo diễn
trùng tên (bỏ UNIQUE trên `directors.name`, giữ index thường để tìm kiếm).
Dừng backend và sao lưu trước khi chạy. Thời gian của phim cũ chưa được lưu
trước đây sẽ được khởi tạo tại lúc migration.

Migration `cinema-ticket/backend/migrations/20261111_movie_rating_timestamps_not_null.sql`
đặt `movie_ratings.created_at` và `updated_at` thành `DATETIME(6) NOT NULL`.
Giá trị thời gian đã có được giữ nguyên; giá trị NULL lấy từ cột thời gian
còn lại hoặc thời điểm migration nếu cả hai đều chưa có.

Migration `cinema-ticket/backend/migrations/20261111_showtime_time_constraints.sql`
bắt buộc thời gian bắt đầu/kết thúc suất chiếu và thêm CHECK
`end_time > start_time`. Nếu lịch cũ có NULL hoặc kết thúc không sau bắt đầu,
cần sửa dữ liệu trước khi chạy migration; các lịch hợp lệ được giữ nguyên.

Migration `cinema-ticket/backend/migrations/20261111_showtime_status_not_null.sql`
bắt buộc `showtimes.status` (`OPEN`, `CLOSED`, `CANCELLED`). Nếu dữ liệu cũ
có trạng thái NULL, cần gán trạng thái phù hợp trước khi chạy migration.

Migration `cinema-ticket/backend/migrations/20261111_ticket_checked_in_by.sql`
thêm `tickets.checked_in_by` tham chiếu `users.id`. Backend tự ghi tài khoản
thực hiện check-in; API trả `checkedInBy` và `checkedInByName`. Quét lại vé
giữ nguyên người/thời điểm check-in đầu tiên. Vé cũ không rõ người check-in
và vé chưa check-in để NULL.

Migration `cinema-ticket/backend/migrations/20261111_extract_booking_payments.sql`
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

Migration `cinema-ticket/backend/migrations/20261111_booking_booked_staff.sql`
đổi cột `bookings.staff_user_id` thành `booked_staff`, giữ nguyên dữ liệu,
chỉ mục và khóa ngoại tới `users.id`. Dừng backend và sao lưu trước khi chạy.

Migration `cinema-ticket/backend/migrations/20261111_ticket_status_booking_code_not_null.sql`
bắt buộc `tickets.ticket_status` và `bookings.booking_code`. Giữ UNIQUE của
mã đặt vé; dữ liệu NULL cần được sửa trước khi chạy migration.

---

## 4. Chạy Redis

Chọn một trong các cách:

**Docker (dễ nhất):**
```powershell
docker run -d --name redis -p 6379:6379 redis:7
```

**Cài trực tiếp:** dùng Memurai (Windows) hoặc `redis-server` (Linux/macOS).

Kiểm tra:
```powershell
redis-cli ping
# PONG
```

---

## 5. Cấu hình biến môi trường Backend

1. Vào thư mục backend và tạo file `.env` từ file mẫu:

   ```powershell
   cd cinema-ticket/backend
   copy .env.example .env
   ```

2. Mở `.env` và điền giá trị thật:

   | Biến | Ý nghĩa | Bắt buộc |
   |------|---------|----------|
   | `SPRING_DATASOURCE_PASSWORD` | Mật khẩu MySQL của user `root` | Có |
   | `JWT_SECRET_KEY` | Chuỗi bí mật JWT (HS512), nên dài ≥ 64 ký tự ngẫu nhiên | Có |
   | `SPRING_MAIL_USERNAME` | Email Gmail dùng gửi mail (OTP, xác nhận...) | Có* |
   | `SPRING_MAIL_PASSWORD` | **App password** của Gmail (không phải mật khẩu thường) | Có* |
   | `VNPAY_TMN_CODE` | Mã website VNPay sandbox | Có (để thanh toán) |
   | `VNPAY_SECRET_KEY` | Secret key VNPay sandbox | Có (để thanh toán) |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Đăng nhập Google OAuth2 | Không |
   | `APP_OAUTH2_SUCCESS_URL` / `APP_OAUTH2_FAILURE_URL` | URL chuyển hướng sau OAuth2 | Không (có mặc định) |

   \* Các biến không có giá trị mặc định trong `application.yaml` (như password, JWT, mail, VNPay) **phải được khai báo**, nếu không backend sẽ lỗi khi khởi động. Nếu chưa dùng tính năng nào đó, có thể điền giá trị giả tạm để backend khởi động được, nhưng tính năng đó sẽ không hoạt động.

3. Cách lấy các khóa:
   - **Gmail app password:** bật xác minh 2 bước → Tài khoản Google → Bảo mật → Mật khẩu ứng dụng.
   - **VNPay sandbox:** đăng ký tại https://sandbox.vnpayment.vn/devreg/
   - **Google OAuth2:** tạo OAuth client tại Google Cloud Console, thêm redirect URI `http://localhost:8081/api/login/oauth2/code/google`.

> Không commit file `.env` lên GitHub (chứa thông tin bí mật).

---

## 6. Chạy Backend

Từ thư mục `cinema-ticket/backend`:

**Windows (PowerShell/CMD):**
```powershell
.\mvnw.cmd spring-boot:run
```

**Linux/macOS:**
```bash
./mvnw spring-boot:run
```

Hoặc build ra file jar rồi chạy:
```powershell
.\mvnw.cmd clean package -DskipTests
java -jar target\backend-0.0.1-SNAPSHOT.jar
```
(Tên file jar có thể khác, xem trong thư mục `target/`.)

Chạy thành công khi log có dòng dạng `Started BackendApplication in ... seconds`.

Kiểm tra nhanh trên trình duyệt hoặc terminal:
```powershell
curl http://localhost:8081/api/movie/now-showing
```

> `.env` được đọc từ thư mục làm việc hiện tại, nên hãy chạy lệnh **trong thư mục `backend`**
> (hoặc từ thư mục gốc dự án, vì `application.yaml` đã thử nhiều đường dẫn).

---

## 7. Cấu hình và chạy Frontend

Mở **terminal mới**:

```powershell
cd cinema-ticket/frontend
copy .env.example .env
npm install
npm run dev
```

Nội dung `.env` của frontend:
```
VITE_API_BASE_URL=http://localhost:8081/api
```

Mở trình duyệt: **http://localhost:5173**

Các lệnh khác:

| Lệnh | Tác dụng |
|------|----------|
| `npm run dev` | Chạy chế độ phát triển |
| `npm run build` | Build bản production vào `dist/` |
| `npm run preview` | Xem thử bản build |
| `npm run lint` | Kiểm tra lỗi code bằng ESLint |

---

## 8. Nạp dữ liệu demo (tùy chọn)

Để reset demo, backend phải được khởi động với profile `dev` (không có `prod`) và `app.maintenance.cleanup-enabled=true`; API cleanup mặc định tắt và yêu cầu ADMIN. Cách bật được ghi trong [backend context](cinema-ticket/backend/backend_overview.md). Khi backend **đang chạy** với cấu hình này, mở PowerShell tại `cinema-ticket/backend`:

```powershell
.\seed-data.ps1
```

Script sẽ gọi API `http://localhost:8081/api` để tạo dữ liệu mẫu (phim, rạp, phòng, suất chiếu, tài khoản...).
Nếu bị chặn chạy script:
```powershell
powershell -ExecutionPolicy Bypass -File .\seed-data.ps1
```

Ngoài ra backend còn có `DataSeeder` có thể tự nạp một số dữ liệu khi khởi động.

---

## 9. Thứ tự chạy tóm tắt

1. Bật **MySQL** và tạo database `cinema`
2. Bật **Redis**
3. Tạo `backend/.env` và điền khóa
4. Chạy **backend** (`mvnw spring-boot:run`) → cổng 8081
5. Tạo `frontend/.env`, `npm install`, `npm run dev` → cổng 5173
6. (Tùy chọn) chạy `seed-data.ps1`
7. Truy cập http://localhost:5173

---

## 10. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân / Cách xử lý |
|-----|--------------------------|
| `Could not resolve placeholder 'SPRING_DATASOURCE_PASSWORD'` | Chưa tạo `.env` hoặc thiếu biến. Kiểm tra lại mục 5 |
| `Access denied for user 'root'` | Sai mật khẩu MySQL trong `.env` |
| `Unknown database 'cinema'` | Chưa tạo database `cinema` (mục 3) |
| `Unable to connect to Redis` / `Connection refused: 6379` | Redis chưa chạy (mục 4) |
| `Port 8081 was already in use` | Có tiến trình khác dùng cổng 8081. Tắt nó hoặc đổi `server.port` |
| `invalid target release: 21` | Đang dùng JDK thấp hơn 21. Cài JDK 21 và đặt `JAVA_HOME` |
| Frontend gọi API lỗi CORS / Network Error | Backend chưa chạy hoặc `VITE_API_BASE_URL` sai. Sửa rồi chạy lại `npm run dev` |
| `npm install` lỗi | Xóa `node_modules` và `package-lock.json` rồi cài lại, hoặc cập nhật Node.js |
| Gửi mail lỗi | Dùng App Password của Gmail, không dùng mật khẩu thường |
| Thanh toán VNPay không quay về | `return-url` đang là `http://localhost:5173/payment/vnpay-return`, cần chạy frontend đúng cổng 5173 |

---

## 11. Cấu trúc thư mục chính

```
TTCS_N9_D23CN/
├── HUONG_DAN_CHAY_DU_AN.md      # File này
└── cinema-ticket/
    ├── backend/                 # Spring Boot API
    │   ├── src/main/java/com/ltweb/backend/
    │   ├── src/main/resources/application.yaml
    │   ├── .env.example
    │   ├── movie.sql
    │   ├── seed-data.ps1
    │   ├── mvnw / mvnw.cmd
    │   └── pom.xml
    └── frontend/                # React + Vite
        ├── src/
        ├── .env.example
        ├── package.json
        └── vite.config.js
```

