# MoviePTIT — Project Context

Cập nhật: **2026-11-12**, đối chiếu với mã nguồn trong working tree, bao gồm thay đổi chưa commit. Đây là tài liệu định hướng; controller, service, DTO và cấu hình hiện tại là nguồn xác nhận hành vi.

## Tài liệu theo phần

- [Frontend context và hướng dẫn chạy](frontend/README.md)
- [Backend context và luồng nghiệp vụ](backend/backend_overview.md)
- [Hướng dẫn chạy toàn dự án](../HUONG_DAN_CHAY_DU_AN.md)
- Quy tắc làm việc: [AGENTS.md](../AGENTS.md), đặc biệt GitNexus và hệ thống icon.

## Tổng quan

MoviePTIT là ứng dụng đặt vé rạp phim, gồm frontend React và backend Spring Boot. Chức năng chính: tra cứu phim/rạp/suất chiếu, chọn ghế realtime, mua bắp nước, khuyến mãi, thanh toán VNPay, vé QR, check-in, lịch sử đặt vé, đánh giá phim, hoàn tiền và báo cáo quản trị.

| Phần | Công nghệ / cấu hình trong repo |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Axios, Framer Motion, Recharts |
| Backend | Java 21, Spring Boot 3.4.0, Spring Security, JPA/JDBC, MapStruct, Lombok |
| Dữ liệu | MySQL `cinema` tại `localhost:3306`; Redis tại `localhost:6379` |
| REST API | `http://localhost:8081/api` |
| Frontend dev | `http://localhost:5173` khi cổng còn trống |
| Realtime | SockJS/STOMP tại `http://localhost:8081/api/ws` |
| Tích hợp | VNPay sandbox, Google OAuth2, Gmail SMTP, ZXing |

## Cấu trúc

```text
cinema-ticket/
  codex.md
  backend/
    pom.xml
    backend_overview.md
    migrations/                  # SQL chuyển đổi schema/dữ liệu thủ công
    src/main/resources/application.yaml
    src/main/java/com/ltweb/backend/
      config/ controller/ dto/ entity/ enums/ event/
      exception/ job/ mapper/ repository/ service/ util/
    src/test/java/com/ltweb/backend/service/
  frontend/
    README.md
    package.json
    src/
      App.jsx
      AnimatedRoutes.jsx
      api/ assets/ components/ context/ pages/ utils/
      index.css
```

## Chạy và kiểm tra

Backend, từ `cinema-ticket/backend`:

```powershell
mvn spring-boot:run
mvn -q -DskipTests compile
mvn test
```

Frontend, từ `cinema-ticket/frontend`:

```powershell
npm install
npm run dev
npm run build
npm run lint
```

Backend cần MySQL, Redis và biến môi trường theo `application.yaml`: `SPRING_DATASOURCE_PASSWORD`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `JWT_SECRET_KEY`, `VNPAY_TMN_CODE`, `VNPAY_SECRET_KEY`. Google login dùng `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; có thể cấu hình `APP_OAUTH2_SUCCESS_URL` và `APP_OAUTH2_FAILURE_URL`. YAML nạp các file `.env` tùy chọn theo đường dẫn được khai báo. Không chép giá trị bí mật vào tài liệu.

Frontend đọc `VITE_API_BASE_URL`, mặc định `http://localhost:8081/api`. `vite.config.js` hiện không cấu hình proxy API.

## Vai trò và phạm vi

- `USER`: đặt vé, thanh toán, xem đơn cá nhân, yêu cầu hoàn tiền, đánh giá phim.
- `STAFF`: bán vé, check-in, xem đơn và dashboard trong phạm vi chi nhánh được phân công.
- `MANAGER`: quản lý nghiệp vụ chi nhánh qua `/manager`, gồm suất chiếu, bắp nước, người dùng, báo cáo, hoàn tiền, thông báo và nhật ký theo quyền backend.
- `ADMIN`: quản trị toàn hệ thống, danh mục phim và cấu hình hệ thống.

Frontend có route guard để điều hướng theo role. Backend kiểm tra quyền bằng `SecurityConfig`, `@PreAuthorize` và điều kiện chủ sở hữu/chi nhánh trong service; route guard frontend không thay thế các kiểm tra này.

## Hợp đồng dữ liệu cần giữ đồng bộ

- Entity dùng khóa chính `id`; DTO vẫn có tên theo API như `bookingId`, `showtimeId`, `notificationId`. Không suy ra tên JSON trực tiếp từ entity.
- `Booking` liên kết `Payment` một-một. Trạng thái thanh toán, phương thức, mã giao dịch và dữ liệu hoàn tiền nằm trong `payments`. `BookingMapper` vẫn trả các trường thanh toán phẳng trong `BookingResponse`.
- Người bán là `Booking.staffUser`, ánh xạ cột `booked_staff`.
- `Room.roomTechnology` và `Showtime.screeningFormat` tách biệt; không dùng mô hình `RoomType` cũ.
- `Showtime.ticketPrice` là giá chung cho suất chiếu; `Ticket.price` giữ giá tại thời điểm bán. Không dùng bảng giá theo loại ghế cũ.
- `Seat` có loại `STANDARD`, `VIP`, `COUPLE`, không còn thuộc tính `isActive`.
- `MovieStatus`: `UPCOMING`, `NOW_SHOWING`, `ENDED`; khả năng hiển thị công khai dùng `isPublic`, không dùng trạng thái `INACTIVE`.
- `TicketStatus`: `AVAILABLE`, `HOLDING`, `BOOKED`. Check-in ghi `checkedInAt` và `checkedInBy`, không đổi sang trạng thái `CHECKED_IN`.

## Trạng thái nghiệp vụ hiện tại

- API cleanup mặc định tắt; chỉ đăng ký khi có profile `dev`, không có `prod`, và `app.maintenance.cleanup-enabled=true`, đồng thời yêu cầu ADMIN. Script reset demo đăng nhập trước cleanup. VNPay query/refund chỉ cho ADMIN hoặc MANAGER đúng chi nhánh; service kiểm tra tài khoản hiện tại trong DB và dùng thông tin giao dịch phía server. Xem backend context để bật chế độ reset và biết giới hạn với giao dịch cũ.
- JWT phân biệt `token_use=access|refresh`; Redis tách `auth:access:revoked:{jti}` và `auth:refresh:active:{jti}`. Chữ ký/claim được kiểm tra trước Redis; refresh tiêu thụ nguyên tử, chặn BLOCKED/INACTIVE. Token cũ thiếu claim mới bị từ chối và cần đăng nhập lại. Frontend dùng chung một lần refresh cho các request 401 đồng thời.
- Giới hạn số vé mỗi giao dịch vẫn tồn tại: `booking.maxTicketsPerTransaction`, mặc định 8, áp dụng cho khách và nhân viên. Giới hạn cộng dồn theo phim `booking.maxTicketsPerMovie` đã gỡ bỏ.
- Thời gian giữ ghế lấy từ `booking.holdMinutes`, mặc định 6 phút. Redis key `seat_hold:{showtimeId}:{seatId}` chứa mã booking làm chủ sở hữu.
- `BookingTransactionEffects` chỉ giải phóng khóa đúng chủ sở hữu, dọn khóa khi rollback và thực hiện các cập nhật bên ngoài DB sau commit.
- Đơn tiền mặt tại quầy hoàn tất ngay; phương thức khác tiền mặt tạo đơn chờ thanh toán. VNPay tạo URL dựa trên booking và số tiền lưu phía server.
- Duyệt hoàn VNPAY và API refund trực tiếp dùng chung `BookingRefundService`: commit lần thử trước gọi cổng, chỉ hoàn tất REFUNDED sau xác nhận có chữ ký/đúng giao dịch. PROCESSING/UNKNOWN không gửi lệnh refund mới và không được từ chối; bấm lại chỉ kiểm tra kết quả. CASH hoàn thủ công. Migration `20261112_refund_gateway_attempt.sql` thêm marker nullable; lịch sử REFUNDED cũ phải đối soát riêng. Xem backend context để biết giới hạn phục hồi và kiểm thử.
- `BookingCleanupJob` chạy mỗi 120 giây, chuyển đơn chờ đã hết hạn sang `CANCELLED`, giải phóng ghế và hoàn tồn bắp nước.
- Tồn kho bắp nước **vẫn hoạt động** trong `FoodStockService`: reserve khi đặt, release khi hủy/hết hạn; tồn `null` nghĩa là không giới hạn. Có cảnh báo `LOW_STOCK`. Bảng lịch sử `food_stock_transactions` là phần cũ có migration xóa riêng.
- Đã gỡ mở/chốt ca, bàn giao tiền, chấm công và lịch trực; staff còn `/staff/dashboard`, bán vé, check-in, đơn hàng và thông báo.
- Báo cáo vận hành hiện gồm doanh thu, thanh toán, yêu cầu hoàn tiền, mức lấp đầy suất chiếu; DTO không còn phần ca trực/lịch trực/tồn kho.
- Thông báo có lọc người nhận, role và chi nhánh. Danh sách và số chưa đọc hiện chỉ xét 100 thông báo mới nhất toàn hệ thống trước khi lọc.

## Quy tắc khi cập nhật

- Chạy GitNexus impact trước khi sửa symbol; dùng đúng repo `TTCS_N9_D23CN`. `UNKNOWN` cần đối chiếu nguồn và tham chiếu. Chạy `detect_changes` trước commit.
- Index GitNexus quan sát trong lần cập nhật này được tạo ngày 2026-11-11; mã nguồn working tree được đọc trực tiếp để xác nhận các phần đang thay đổi. Khi graph không khớp, cập nhật index bằng `node .gitnexus/run.cjs analyze --index-only` từ root.
- Đổi DTO phải kiểm tra mapper, API client và các trang dùng dữ liệu. Không sửa mã sinh trong `target/` hoặc bundle `dist/` như mã nguồn.
- Icon UI dùng Lucide qua `frontend/src/components/Common/CinemaIcons.jsx`; không thêm emoji icon hoặc SVG tự viết. Chỉ logo thương hiệu `MoviePTITLogoIcon` được dùng SVG tùy chỉnh.
- Migration trong `backend/migrations/` cần đọc riêng theo schema hiện có; có script đổi tên/xóa cột, bảng và dữ liệu. `ddl-auto: update` không thay thế chuyển đổi dữ liệu. Việc cập nhật context này không chạy migration.
- Backend có test nghiệp vụ trong `src/test`, bao gồm `JwtSecurityTest`. Frontend có build/lint và test interceptor JWT bằng Node: `node --experimental-vm-modules --test tests/axiosClient.test.mjs` từ thư mục frontend; chưa khai báo script `test` trong package.json.
