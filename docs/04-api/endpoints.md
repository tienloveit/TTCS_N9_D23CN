# Danh sách endpoint

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Đường dẫn tính từ `http://localhost:8081/api`. Quy ước phản hồi, lỗi và phân trang ở [conventions.md](conventions.md). Dự án chưa có Swagger/OpenAPI, nên file này là danh mục chính.

Cột **Quyền** gộp cả ba lớp: `SecurityConfig`, `@PreAuthorize` và quy tắc trong service. Ký hiệu:

- **Công khai**: không cần token.
- **Đăng nhập**: mọi role.
- **(CN)**: STAFF/MANAGER chỉ thao tác dữ liệu thuộc chi nhánh được phân công.

Cột **Client** là hàm trong [frontend/src/api/index.js](../../frontend/src/api/index.js).

## Xác thực và tài khoản

| Method | Path | Quyền | Mô tả | Client |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | Công khai | `{username, password}` → `{accessToken, refreshToken}` | `authApi.login` |
| POST | `/auth/refresh` | Công khai | `{refreshToken}` → cặp token mới. Token cũ hết hiệu lực. | `authApi.refresh` |
| POST | `/auth/logout` | Công khai | `{accessToken, refreshToken}`. Luôn trả 200. | `authApi.logout` |
| POST | `/auth/change-password` | Đăng nhập | `{currentPassword, newPassword}` | `authApi.changePassword` |
| POST | `/auth/forgot-password` | Công khai | `{email}`. Gửi OTP 6 chữ số, hiệu lực 5 phút. | `authApi.forgotPassword` |
| POST | `/auth/reset-password` | Công khai | `{email, otp, newPassword}` (nhận cả `OTP`) | `authApi.resetPassword` |
| GET | `/oauth2/authorization/google` | Công khai | Trình duyệt mở để bắt đầu đăng nhập Google | `authApi.getGoogleLoginUrl` |
| GET | `/login/oauth2/code/google` | Công khai | Google gọi lại, backend chuyển về frontend kèm token | — |
| POST | `/sign-up` | Công khai | Đăng ký tài khoản USER | `userApi.register` |
| POST | `/users` (cũ: `/user`) | ADMIN, MANAGER | Tạo tài khoản. MANAGER chỉ tạo STAFF của chi nhánh mình. | `userApi.create` |
| GET | `/users` | ADMIN, MANAGER | Tìm theo `username`, `email`, `phone`, phân trang từ 1. MANAGER chỉ thấy STAFF (CN). | `userApi.getAll` |
| GET, PUT, DELETE | `/users/{id}` | ADMIN, MANAGER | MANAGER chỉ với STAFF (CN) | `userApi.getById`, `update`, `delete` |
| PUT | `/users/{id}/status?status=` | ADMIN, MANAGER | Đổi `ACTIVE`, `INACTIVE`, `BLOCKED` | `userApi.updateStatus` |
| GET | `/my-info` | Đăng nhập | Hồ sơ của chính mình | `userApi.getMyInfo` |
| PUT | `/my-info` | Đăng nhập | Chỉ `fullName`, `dob`, `phoneNumber`, `gender`, `email`. Không đổi role, chi nhánh, trạng thái. | `userApi.updateMyInfo` |

## Phim

| Method | Path | Quyền | Mô tả | Client |
| --- | --- | --- | --- | --- |
| GET | `/movie?movieName=` | Công khai | Danh sách phim. Phim ẩn chỉ ADMIN thấy. MANAGER chỉ thấy phim có suất ở chi nhánh mình. | `movieApi.getAll` |
| GET | `/movie/now-showing`, `/movie/upcoming` | Công khai | Phim theo trạng thái | `movieApi.getNowShowing`, `getUpcoming` |
| GET | `/movie/{id}` | Công khai | Chi tiết phim | `movieApi.getById` |
| POST, PUT, DELETE | `/movie`, `/movie/{id}` | ADMIN | Tạo, sửa, xóa phim | `movieApi.create`, `update`, `delete` |
| POST | `/movie/{id}/rating` | Đăng nhập | `{score 1–5, comment}`. Gọi lại là cập nhật. | `movieApi.rate` |
| GET | `/movie/{id}/rating/my` | Đăng nhập | Đánh giá của mình, kèm điểm trung bình | `movieApi.getMyRating` |
| GET | `/movie/{id}/ratings` | Công khai | Mọi đánh giá, mới nhất trước | `movieApi.getRatings` |
| POST | `/movie/media` | ADMIN | Multipart field `file`, JPG/PNG/WebP tối đa 5 MB. Trả đường dẫn ảnh. | Trong `MovieForm.jsx` |
| GET | `/movie/media/{filename}` | Công khai | Trả byte ảnh | — |
| GET | `/genre`, `/genre/{id}` | Công khai | Thể loại | `genreApi.getAll` |
| POST, PUT, DELETE | `/genre`, `/genre/{id}` | ADMIN | | `genreApi.create`, `update`, `delete` |
| GET | `/director`, `/director/{id}` | Công khai | Đạo diễn | `directorApi.getAll`, `getById` |
| POST, PUT, DELETE | `/director`, `/director/{id}` | ADMIN | | `directorApi.create`, `update`, `delete` |

## Rạp, phòng, ghế

| Method | Path | Quyền | Mô tả | Client |
| --- | --- | --- | --- | --- |
| GET | `/branch` | Công khai | Mọi chi nhánh. MANAGER đăng nhập chỉ thấy chi nhánh mình. | `branchApi.getAll` |
| GET | `/branch/{id}` | ADMIN, MANAGER (CN) | | `branchApi.getById` |
| PUT | `/branch/{id}` | ADMIN, MANAGER (CN) | | `branchApi.update` |
| POST, DELETE | `/branch`, `/branch/{id}` | ADMIN | Xóa chi nhánh còn dữ liệu trả `RESOURCE_IN_USE` | `branchApi.create`, `delete` |
| GET | `/room?branchId=&status=` | ADMIN, MANAGER (CN) | | `roomApi.getAll` |
| GET, PUT, DELETE | `/room/{id}` | ADMIN, MANAGER (CN) | | `roomApi.getById`, `update`, `delete` |
| POST | `/room` | ADMIN, MANAGER (CN) | | `roomApi.create` |
| GET | `/seat/room/{roomId}`, `/seat/{id}` | Đăng nhập | Ghế của phòng | `seatApi.getByRoom` |
| PUT | `/seat/room/{roomId}/layout` | ADMIN, MANAGER (CN) | Ghi cả sơ đồ: `{seats: [{seatId, rowLabel, seatNumber, seatType}]}` | `seatApi.updateLayout` |
| POST, PUT, DELETE | `/seat`, `/seat/{id}` | ADMIN, MANAGER (CN) | Sửa từng ghế | — |

## Suất chiếu và vé

| Method | Path | Quyền | Mô tả | Client |
| --- | --- | --- | --- | --- |
| GET | `/showtime` | Công khai | Mọi suất kèm số ghế trống. STAFF/MANAGER đăng nhập chỉ thấy (CN). | `showtimeApi.getAll` |
| GET | `/showtime/today` | ADMIN, STAFF | Suất hôm nay | `showtimeApi.getToday` |
| GET | `/showtime/{id}` | Công khai | | `showtimeApi.getById` |
| GET | `/showtime/movie/{movieId}` | Công khai | Suất của một phim | `showtimeApi.getByMovie` |
| GET | `/showtime/branch/{branchId}?date=` | Công khai | Lịch chiếu của chi nhánh trong ngày, gom theo phim | `showtimeApi.getByBranch` |
| GET | `/showtime/room/{roomId}` | ADMIN, MANAGER | | `showtimeApi.getByRoom` |
| POST | `/showtime` | ADMIN, MANAGER (CN) | `{roomId, movieId, startTime, endTime, status, screeningFormat, ticketPrice}`. Tạo sẵn vé cho mọi ghế. | `showtimeApi.create` |
| PUT | `/showtime/{id}` | ADMIN, MANAGER (CN) | Đổi giá chỉ khi chưa có vé giữ hoặc đã bán | `showtimeApi.update` |
| DELETE | `/showtime/{id}` | ADMIN | Chỉ khi chưa có đơn | `showtimeApi.delete` |
| GET | `/ticket/showtime/{showtimeId}` | Công khai. STAFF/MANAGER: (CN) | Sơ đồ ghế của suất, có `displayStatus` gộp từ DB và Redis | `ticketApi.getByShowtimeId` |
| GET | `/ticket/{id}` | Chủ vé, STAFF/MANAGER (CN), ADMIN | | `ticketApi.getById` |
| GET | `/ticket` | ADMIN | Mọi vé | `ticketApi.getAll` |
| PUT, DELETE | `/ticket/{id}` | ADMIN | | `ticketApi.update` |
| POST | `/ticket/check-in` | ADMIN, STAFF (CN), MANAGER (CN) | `{code}`: chuỗi QR hoặc mã đơn | `ticketApi.checkIn` |
| POST | `/ticket/check-in/qr-image` | ADMIN, STAFF (CN), MANAGER (CN) | Multipart field `qrImage` | `ticketApi.checkInByQRImage` |

## Đặt vé

| Method | Path | Quyền | Mô tả | Client |
| --- | --- | --- | --- | --- |
| POST | `/booking` | Đăng nhập | `{showtimeId, seatIds, foods: [{foodId, quantity}], promotionCode}`. Tạo đơn `PENDING`. | `bookingApi.create` |
| POST | `/booking/staff` | ADMIN, STAFF (CN) | Thêm `customerName`, `customerEmail`, `customerPhone`, `confirmedCustomerId`, `paymentMethod` (mặc định `CASH`) | `bookingApi.staffCreate` |
| GET | `/booking/search` | ADMIN, STAFF (CN), MANAGER (CN) | Lọc và phân trang. Tham số ở [conventions.md](conventions.md#phân-trang-và-sắp-xếp). | `bookingApi.search` |
| GET | `/booking/{id}` | Chủ đơn, STAFF/MANAGER (CN), ADMIN | Có `refundDeadline` | `bookingApi.getById` |
| GET | `/booking/my-bookings/list` | Đăng nhập | Mọi đơn của mình | `bookingApi.getMyBookings` |
| GET | `/booking/my-bookings/{id}` | Chủ đơn | | `bookingApi.getMyBookingById` |
| PUT | `/booking/{id}` | ADMIN, STAFF (CN) | `{status}`. Chỉ chấp nhận chuyển sang `CANCELLED`. | `bookingApi.update` |
| DELETE | `/booking/{id}` | Chủ đơn, STAFF (CN), ADMIN | Hủy đơn `PENDING` | `bookingApi.cancel` |
| PATCH | `/booking/{id}/apply-promotion` | Chủ đơn | `{promotionCode}`. Chuỗi rỗng là bỏ mã. | `bookingApi.applyPromotion` |
| POST | `/booking/{id}/refund-request` | Chủ đơn. Đơn tại quầy: STAFF/MANAGER (CN), ADMIN | `{reason}`. Bắt buộc lý do khi gửi thay khách. | `bookingApi.requestRefund` |
| GET | `/booking/refunds` | ADMIN, MANAGER (CN) | Đơn đang hoặc đã qua luồng hoàn | `bookingApi.getRefunds` |
| POST | `/booking/{id}/refund-process` | ADMIN, MANAGER (CN) | `{approved, note}` | `bookingApi.processRefund` |
| POST | `/booking/{id}/refund-decision` | ADMIN, MANAGER (CN) | Như trên, `approved` bắt buộc | — |
| GET | `/staff/customers/lookup?phone=&email=` | ADMIN, STAFF | Tìm khách trước khi bán, thông tin đã che bớt | `staffApi.lookupCustomer` |

## Bắp nước và khuyến mãi

| Method | Path | Quyền | Mô tả | Client |
| --- | --- | --- | --- | --- |
| GET | `/food` | Công khai | Món đang bán. STAFF/MANAGER đăng nhập chỉ thấy món (CN) và món dùng chung. | `foodApi.getAll` |
| GET | `/food/all` | ADMIN, MANAGER (CN) | Gồm món đã tắt | `foodApi.getAllAdmin` |
| GET | `/food/{id}` | Công khai | | `foodApi.getById` |
| POST, PUT | `/food`, `/food/{id}` | ADMIN, MANAGER (CN) | Ghi nhật ký `FOOD_CREATED`, `FOOD_UPDATED` | `foodApi.create`, `update` |
| DELETE | `/food/{id}` | ADMIN, MANAGER (CN) | Tắt món (`active = false`), ghi `FOOD_DISABLED` | `foodApi.delete` |
| GET | `/promotion` | ADMIN, MANAGER | MANAGER thấy mã (CN) và mã toàn hệ thống | `promotionApi.getAll` |
| GET | `/promotion/available` | Đăng nhập | Mã người gọi dùng được | `promotionApi.getAvailable` |
| POST | `/promotion/validate` | Đăng nhập | `{code, orderAmount, branchId}` → số tiền giảm. Không giữ lượt. | `promotionApi.validate` |
| POST, PUT | `/promotion`, `/promotion/{id}` | ADMIN, MANAGER (CN) | | `promotionApi.create`, `update` |
| DELETE | `/promotion/{id}` | ADMIN, MANAGER (CN) | Tắt mã (`active = false`) | `promotionApi.delete` |

## VNPay

| Method | Path | Quyền | Mô tả | Client |
| --- | --- | --- | --- | --- |
| POST | `/v1/vnpay/payment-url` | Chủ đơn, người bán, ADMIN | `{bookingId, bankCode?, language?}` → `{paymentUrl, txnRef}` | `vnpayApi.createPaymentUrl` |
| GET | `/v1/vnpay/return` | Công khai | Frontend gửi nguyên query string VNPay trả về | `vnpayApi.handleReturn` |
| GET | `/v1/vnpay/ipn` | Công khai | VNPay gọi. Trả `{RspCode, Message}`. | — |
| POST | `/v1/vnpay/querydr` | ADMIN, MANAGER (CN) | `{orderId, transDate}`. `result` là chuỗi JSON thô của VNPay. | `vnpayApi.queryTransaction` |
| POST | `/v1/vnpay/refund` | ADMIN, MANAGER (CN) | `{orderId, amount, trantype: "02", transDate, user}`. `result` là trạng thái booking sau xử lý. | `vnpayApi.refund` |

## Vận hành và báo cáo

| Method | Path | Quyền | Mô tả | Client |
| --- | --- | --- | --- | --- |
| GET | `/staff/dashboard` | ADMIN, STAFF | Số liệu quầy trong ngày, đối soát két | `staffApi.getDashboard` |
| GET | `/admin/analytics/dashboard?from=&to=` | ADMIN, MANAGER (CN) | Mặc định 30 ngày | `analyticsApi.getDashboard` |
| GET | `/admin/operations/daily-report?date=&branchId=` | ADMIN, MANAGER (CN) | Báo cáo vận hành một ngày | `operationsApi.getDailyReport` |
| GET | `/admin/reports/revenue?from=&to=&branchId=&movieId=&staffId=&paymentMethod=` | ADMIN, MANAGER (CN) | Theo ngày thanh toán. Chi tiết tối đa 200 dòng. | `reportsApi.getRevenue` |
| GET | `/admin/reports/export/revenue.xlsx` | ADMIN, MANAGER (CN) | Cùng tham số với báo cáo doanh thu | `reportsApi.exportRevenue` |
| GET | `/admin/reports/export/operations.xlsx?date=&branchId=` | ADMIN, MANAGER (CN) | Chỉ số tổng hợp | `reportsApi.exportOperations` |
| GET | `/notifications` | Đăng nhập | 100 thông báo mới nhất người gọi được xem | `notificationApi.getAll` |
| GET | `/notifications/unread-count` | Đăng nhập | | `notificationApi.getUnreadCount` |
| POST | `/notifications/{id}/read` | Đăng nhập | Đánh dấu đã đọc cho người gọi | `notificationApi.markRead` |
| GET | `/admin/audit-logs` | ADMIN, MANAGER (CN) | 100 bản ghi mới nhất | `auditLogApi.getRecent` |
| GET | `/admin/settings` | ADMIN | Tham số nghiệp vụ | `systemSettingsApi.getAll` |
| PUT | `/admin/settings/{settingKey}` | ADMIN | `{settingValue, description?}`. Ghi `SYSTEM_SETTING_UPDATED`. | `systemSettingsApi.update` |
| DELETE | `/v1/cleanup/database` | ADMIN, chỉ khi bật cleanup ở profile `dev` | Xóa và tạo lại dữ liệu demo. Xem [demo-data.md](../01-getting-started/demo-data.md). | — |

## WebSocket

SockJS endpoint `/ws` (công khai) và topic `/topic/showtime/{showtimeId}/seats`. Xem [realtime.md](realtime.md).

## Khi thêm endpoint

Làm theo [add-endpoint.md](../07-development/how-to/add-endpoint.md), rồi thêm một dòng vào bảng tương ứng ở file này. Endpoint đọc mới cũng phải được thêm vào `paths()` của `ReadEndpointsSmokeTest`.
