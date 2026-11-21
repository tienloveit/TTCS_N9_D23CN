# Quy ước API

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Dự án chưa có Swagger/OpenAPI. Hợp đồng JSON là DTO trong `backend/.../dto` cùng mapper tương ứng. Đọc DTO, không đọc tên field của entity. Danh sách endpoint nằm trong [endpoints.md](endpoints.md).

## Địa chỉ

- Base URL: `http://localhost:8081/api`. `/api` là context path của Spring (`server.servlet.context-path`). Controller không lặp lại `/api`.
- Tất cả đường dẫn trong tài liệu API tính từ base URL. Ví dụ `GET /movie/now-showing` là `http://localhost:8081/api/movie/now-showing`.
- CORS cho phép origin `http://localhost` và `http://127.0.0.1` ở cổng 5173, 5174, 3000, method GET/POST/PUT/PATCH/DELETE/OPTIONS, mọi header, có credentials.

## Phản hồi thành công

Phần lớn endpoint trả `ApiResponse<T>`:

```json
{
  "code": 200,
  "message": "Booking cancelled successfully!",
  "result": { }
}
```

| Trường | Ý nghĩa |
| --- | --- |
| `code` | Mặc định 200. |
| `message` | Có thể vắng mặt. Field null bị bỏ khỏi JSON (`@JsonInclude(NON_NULL)`). |
| `result` | Dữ liệu. Frontend đọc `response.data.result`. |

### Ngoại lệ không theo `ApiResponse`

| Endpoint | Định dạng |
| --- | --- |
| `GET /v1/vnpay/ipn` | `{"RspCode": "00", "Message": "Confirm Success"}` theo đặc tả VNPay. Xem [payment-refund.md](../02-domain/payment-refund.md#return-và-ipn). |
| `GET /v1/vnpay/return` | Vẫn là `ApiResponse`, nhưng `code` mang nghĩa nghiệp vụ: 200 đã ghi nhận thanh toán, 97 sai chữ ký, 99 không thành công. HTTP status luôn 200. |
| `GET /movie/media/{filename}` | Byte ảnh JPG/PNG/WebP. |
| `GET /admin/reports/export/*.xlsx` | Byte file, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename=...`. Frontend gọi với `responseType: 'blob'`. |
| Danh sách đơn XLSX | Không có endpoint. Trình duyệt tạo file bằng `write-excel-file` từ dữ liệu đã tải. |

## Lỗi

Mọi lỗi trả `ErrorResponse` với HTTP status tương ứng:

```json
{
  "code": 400,
  "error": "Bad Request",
  "message": "One or more selected tickets are not available",
  "timestamp": "2026-11-21T12:00:00.000+00:00",
  "path": "/api/booking"
}
```

JSON không có tên mã lỗi (`TICKET_NOT_AVAILABLE`), chỉ có `code` số và `message`. Frontend hiển thị `message` hoặc thông báo riêng theo HTTP status. Một vài mã cũ có `code` khác HTTP status (ví dụ `SEATTYPE_EXIST` có `code` 401 nhưng HTTP 400), nên dựa vào HTTP status khi phân nhánh.

### Bảng mã lỗi

Nguồn: [ErrorCode.java](../../backend/src/main/java/com/ltweb/backend/exception/ErrorCode.java).

| HTTP | Mã | Khi nào |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Thiếu, sai hoặc hết hạn access token. Cũng dùng khi không có quyền với đơn hoặc vé cụ thể. |
| 401 | `LOGIN_FAILED` | Sai tài khoản hoặc mật khẩu, tài khoản bị khóa. |
| 401 | `TOKEN_INVALID` | Refresh token không hợp lệ hoặc đã dùng. |
| 401 | `PASSWORD_INCORRECT` | Mật khẩu hiện tại sai khi đổi mật khẩu. |
| 401 | `OTP_INVALID` | OTP sai hoặc hết hạn. |
| 401 | `OAUTH2_EMAIL_NOT_VERIFIED` | Email Google chưa xác minh. |
| 403 | `ACCESS_DENIED` | Đủ token nhưng thiếu role, hoặc sai chi nhánh. |
| 403 | `TICKET_WRONG_BRANCH` | Soát vé của chi nhánh khác. |
| 429 | `OTP_RATE_LIMIT` | Gửi OTP quá 5 lần cho một email trong khoảng 1 phút. |
| 409 | `CUSTOMER_CONFIRMATION_REQUIRED`, `CUSTOMER_CONTACT_CONFLICT` | Xác định khách tại quầy. Xem [bán tại quầy](../02-domain/booking-lifecycle.md#xác-định-khách-tại-quầy). |
| 409 | `RESOURCE_IN_USE` | Xóa dữ liệu còn được tham chiếu (MySQL 1451). Nên ngừng hoạt động thay vì xóa. |
| 409 | `DUPLICATE_VALUE` | Trùng giá trị unique (MySQL 1062). |
| 400 | `VALIDATION_ERROR` | Body không hợp lệ, danh sách ghế hoặc món trùng, khóa cấu hình không tồn tại. |
| 400 | `USER_EXISTED`, `USER_NOT_FOUND` | Đăng ký trùng, không tìm thấy tài khoản hoặc email. |
| 400 | `SHOWTIME_NOT_FOUND` | Suất không tồn tại **hoặc không còn bán được**. |
| 400 | `SHOWTIME_TIME_OVERLAP`, `SHOWTIME_PRICE_LOCKED`, `SHOWTIME_HAS_BOOKINGS`, `ROOM_NOT_AVAILABLE`, `ROOM_HAS_SHOWTIMES` | Quản lý suất và phòng. |
| 400 | `TICKET_NOT_AVAILABLE`, `TICKET_NOT_FOUND`, `MAX_TICKET_PER_TRANSACTION`, `BOOKING_PENDING_LIMIT` | Tạo đơn. |
| 400 | `FOOD_NOT_FOUND`, `FOOD_OUT_OF_STOCK` | Bắp nước không bán ở suất này, hết hàng. |
| 400 | `BOOKING_NOT_FOUND`, `BOOKING_CANNOT_CANCEL`, `INVALID_PAYMENT_STATUS` | Thao tác trên đơn ở trạng thái không phù hợp. |
| 400 | `PROMOTION_NOT_FOUND`, `PROMOTION_EXPIRED`, `PROMOTION_USAGE_LIMIT`, `PROMOTION_MIN_ORDER`, `PROMOTION_TIER_NOT_MET` | Xem [điều kiện áp mã](../02-domain/promotion-membership.md#điều-kiện-áp-mã). |
| 400 | `BOOKING_CANNOT_REFUND`, `BOOKING_ALREADY_REFUNDED`, `REFUND_WINDOW_EXPIRED`, `REFUND_REASON_REQUIRED` | Hoàn tiền. |
| 400 | `INVALID_TICKET_CHECKIN`, `CHECKIN_TOO_EARLY`, `CHECKIN_SHOWTIME_ENDED`, `CHECKIN_SHOWTIME_CANCELLED`, `CHECKIN_CODE_NOT_ACCEPTED`, `INVALID_QR_IMAGE`, `QR_CODE_NOT_FOUND` | Soát vé. |
| 400 | `CUSTOMER_PHONE_INVALID`, `CUSTOMER_EMAIL_INVALID`, `CUSTOMER_NOT_ELIGIBLE` | Thông tin khách tại quầy. |
| 400 | `DATA_INTEGRITY_VIOLATION` | Vi phạm ràng buộc khác. Chi tiết SQL chỉ ghi log. |
| 400 | `MISSING_REQUEST_HEADER` | Thiếu header bắt buộc. |
| 500 | `INTERNAL_ERROR` | Lỗi không lường trước, gồm lỗi gửi OTP qua SMTP. |

## Xác thực

### Token

| Loại | Thời hạn | Claim `token_use` | Dùng để |
| --- | --- | --- | --- |
| Access token | 30 phút | `access` | Header `Authorization: Bearer <token>` cho mọi request cần đăng nhập |
| Refresh token | 30 ngày | `refresh` | Body của `POST /auth/refresh`. Mỗi token chỉ dùng được một lần. |

JWT ký HS512 bằng `JWT_SECRET_KEY`. Claim bắt buộc: `sub` (username), `jti`, `iat`, `exp`, `role`, `token_use`. Access token còn có `branchId`. Hai loại token không dùng thay nhau. Refresh token đặt vào header `Authorization` bị trả 401.

### Đăng nhập và làm mới

```text
POST /auth/login     {username, password}        → result: {accessToken, refreshToken}
POST /auth/refresh   {refreshToken}              → result: {accessToken, refreshToken}  (cặp mới)
POST /auth/logout    {accessToken, refreshToken} → 200
```

- `/auth/refresh` tiêu thụ refresh token cũ bằng Lua compare-and-delete trong Redis rồi cấp cặp mới. Hai request dùng cùng một refresh token thì chỉ một request thành công. Tài khoản `BLOCKED` hoặc `INACTIVE` không được cấp token mới.
- `/auth/logout` là endpoint công khai. Backend thu hồi access token (`auth:access:revoked:{jti}`) tới khi hết hạn và xóa phiên refresh của đúng `sub`. Token thiếu, hết hạn hoặc không hợp lệ được bỏ qua, logout vẫn trả 200, nên phiên có access token đã hết hạn vẫn đăng xuất được. Header Bearer kiểu cũ vẫn được nhận. Logout không thu hồi phiên ở thiết bị khác.
- Đăng nhập Google trả cặp token qua fragment URL. Xem [google-oauth.md](../06-integrations/google-oauth.md).

Quy trình phía client khi gặp 401 (gộp request, thử lại một lần) nằm trong [frontend.md](../03-architecture/frontend.md#xác-thực-và-gọi-api).

### 401 hay 403

| Tình huống | HTTP |
| --- | --- |
| Route cần đăng nhập, không có header `Authorization` | 401 |
| Header Bearer sai định dạng, token sai chữ ký, hết hạn, đã thu hồi, hoặc là refresh token | 401, kể cả ở route công khai |
| Token hợp lệ nhưng role không đủ | 403, kèm header `WWW-Authenticate` |
| Token hợp lệ, role đủ nhưng sai chi nhánh hoặc không phải chủ đơn | 403 `ACCESS_DENIED` hoặc 401 `UNAUTHORIZED` tùy service |

Frontend chỉ làm mới token khi gặp 401, không làm mới khi gặp 403.

## Phân trang và sắp xếp

Không có tham số phân trang chung. Chỉ hai endpoint có phân trang, và quy ước số trang khác nhau:

| Endpoint | Tham số | Trang đầu | Mặc định | Phản hồi |
| --- | --- | --- | --- | --- |
| `GET /booking/search` | `page`, `size` (tối đa 100) | `0` | `size = 15` | `BookingPageResponse`: `content`, `page`, `size`, `totalElements`, `totalPages`, `summary {completed, refundRequested, paidAmount}` |
| `GET /users` | `page`, `size`, `username`, `email`, `phone` | `1` | `size = 10` | `PageResponse`: `data`, `page` (từ 1), `size`, `totalElements`, `totalPages` |

Cả hai sắp xếp cố định theo `createdAt` giảm dần, không nhận tham số `sort`. Các danh sách khác trả toàn bộ, hoặc giới hạn cố định (thông báo và nhật ký: 100 bản ghi mới nhất).

Tham số lọc của `GET /booking/search`: `q` (mã đơn, tài khoản khách, phim, chi nhánh, mã ghế, mã vé), `status`, `paymentStatus` (tên `PaymentStatus` hoặc `NO_TRANSACTION`), `branchId` (chỉ ADMIN), `from`, `to` (ngày đặt, gồm cả hai đầu), `showtimeDate`, `checkedInDate`.

## Kiểu dữ liệu

| Kiểu Java | JSON | Ví dụ |
| --- | --- | --- |
| `LocalDateTime` | Chuỗi ISO không có múi giờ, hiểu là giờ rạp `Asia/Ho_Chi_Minh` | `"2026-11-21T19:30:00"` |
| `LocalDate` | `yyyy-MM-dd` | `"2026-11-21"` |
| Tham số ngày trên query string | ISO date | `?from=2026-11-01&to=2026-11-21` |
| `Promotion.startDate`, `endDate` trong request | `yyyy-MM-dd'T'HH:mm` | `"2026-12-01T00:00"` |
| `BigDecimal` (tiền) | Số | `150000.00` |
| Enum | Tên hằng | `"COMPLETED"` |
| ID | Số. Tên trường theo DTO | `bookingId`, `showtimeId`, `notificationId` |

`ErrorResponse.timestamp` là `java.util.Date` nên được Jackson ghi theo UTC, khác với các trường `LocalDateTime` khác.

## Hợp đồng cần giữ

- `BookingResponse` trả các trường thanh toán và hoàn tiền ở cấp ngoài cùng (`paymentMethod`, `paymentStatus`, `paidAt`, `refundGatewayStatus`, `refundedAt`...), dù DB lưu ở bảng `payments`. Không chuyển frontend sang đọc `booking.payment.*`.
- `refundDeadline` do backend tính. Frontend không tự cộng thời hạn.
- Upload dùng multipart: `POST /movie/media` field `file` (JPG/PNG/WebP, tối đa 5 MB), `POST /ticket/check-in/qr-image` field `qrImage`. Request tối đa 6 MB.
- `PUT /users/{id}/status` nhận `status` trên query string, không ở body.
