# Vai trò và quyền

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

## Ba lớp kiểm tra

Quyền được kiểm tra ở ba nơi. Chỉ hai lớp backend có giá trị bảo mật. Route guard ở frontend chỉ để điều hướng người dùng tới đúng giao diện.

| Lớp | Nơi | Kiểm tra gì |
| --- | --- | --- |
| Route guard (frontend) | `PrivateRoute`, `AdminRoute`, `AdminOnlyRoute`, `StaffRoute` trong [AnimatedRoutes.jsx](../../frontend/src/AnimatedRoutes.jsx) | Đã đăng nhập chưa, role trong access token có được vào khu này không. Người dùng có thể bỏ qua lớp này bằng cách gọi API trực tiếp. |
| Filter và method security (backend) | `SecurityConfig`, `@PreAuthorize` trên controller và service | Route công khai hay cần đăng nhập, role có đủ không. Thiếu hoặc sai token trả 401, đủ token nhưng thiếu role trả 403. |
| Quy tắc trong service (backend) | `BookingAccessPolicy`, `RefundPolicy`, các hàm `require...Access` trong service | Đơn có phải của người gọi không, dữ liệu có thuộc chi nhánh được phân công không, trạng thái tài khoản còn hoạt động không. |

STAFF và MANAGER luôn gắn với một chi nhánh qua `User.branchId`. Backend đọc chi nhánh từ database ở mỗi request, không tin giá trị `branchId` trong token. MANAGER hoặc STAFF chưa được gán chi nhánh bị từ chối ở hầu hết thao tác quản lý.

## Ma trận chức năng

Ký hiệu: **✓** được làm trên toàn hệ thống, **CN** chỉ với dữ liệu thuộc chi nhánh được phân công, **Của mình** chỉ với đơn hoặc tài khoản của chính mình, **—** không được.

### Khách và đặt vé

| Chức năng | Khách chưa đăng nhập | USER | STAFF | MANAGER | ADMIN |
| --- | --- | --- | --- | --- | --- |
| Xem phim công khai, lịch chiếu, sơ đồ ghế, bắp nước | ✓ | ✓ | ✓ | ✓ | ✓ (thấy cả phim ẩn) |
| Đặt vé online (`POST /booking`) | — | ✓ | ✓ | ✓ | ✓ |
| Xem chi tiết đơn (`GET /booking/{id}`) | — | Của mình | Của mình, CN | Của mình, CN | ✓ |
| Lấy URL thanh toán VNPay cho đơn chờ | — | Của mình | Của mình, đơn mình bán | Của mình | ✓ |
| Hủy đơn đang chờ thanh toán | — | Của mình | Của mình, CN | Của mình | ✓ |
| Áp hoặc bỏ mã khuyến mãi cho đơn | — | Của mình | Của mình | Của mình | Của mình |
| Gửi yêu cầu hoàn tiền | — | Của mình | Của mình, đơn quầy CN | Của mình, đơn quầy CN | ✓ đơn quầy, đơn của mình |
| Đánh giá phim | — | ✓ | ✓ | ✓ | ✓ |
| Sửa hồ sơ cá nhân, đổi mật khẩu | — | Của mình | Của mình | Của mình | Của mình |

Mọi tài khoản đăng nhập đều có thể đặt vé online cho chính mình. "Đơn quầy CN" là đơn do nhân viên bán (`staffUser` khác null) thuộc suất chiếu ở chi nhánh được phân công. Nhân viên phải nhập lý do khi gửi thay khách.

### Quầy và soát vé

| Chức năng | STAFF | MANAGER | ADMIN |
| --- | --- | --- | --- |
| Bán vé tại quầy (`POST /booking/staff`) | CN | — | ✓ |
| Tra cứu khách tại quầy | ✓ | — | ✓ |
| Dashboard nhân viên | Số liệu của chính mình, check-in và hoàn tiền theo CN | — | ✓ |
| Soát vé (`/ticket/check-in`) | CN | CN (API cho phép, giao diện chưa có trang riêng) | ✓ |
| Tìm kiếm và xem danh sách đơn (`/booking/search`) | CN | CN | ✓, lọc được theo chi nhánh |
| Sửa trạng thái đơn (`PUT /booking/{id}`) | CN, chỉ được hủy | — | ✓, chỉ được hủy |

### Quản lý

| Chức năng | MANAGER | ADMIN |
| --- | --- | --- |
| Phim, thể loại, đạo diễn, upload poster | — | ✓ |
| Chi nhánh: xem, sửa | CN | ✓ |
| Chi nhánh: tạo, xóa | — | ✓ |
| Phòng, sơ đồ ghế | CN | ✓ |
| Suất chiếu: tạo, sửa | CN | ✓ |
| Suất chiếu: xóa | — | ✓ (chỉ khi chưa có đơn) |
| Người dùng: tạo, xem, sửa, khóa, xóa | Chỉ STAFF thuộc CN. Tài khoản tạo mới luôn là STAFF của CN | ✓ mọi role |
| Bắp nước | CN | ✓ |
| Khuyến mãi | Mã của CN. Xem được cả mã toàn hệ thống nhưng không sửa | ✓ |
| Danh sách và duyệt hoàn tiền | CN | ✓ |
| Truy vấn giao dịch, hoàn tiền trực tiếp VNPay | CN | ✓ |
| Dashboard quản trị, báo cáo doanh thu và vận hành, xuất XLSX | CN | ✓ |
| Nhật ký thao tác (100 bản ghi mới nhất) | CN | ✓ |
| Cấu hình hệ thống | — | ✓ |
| Vé: xem tất cả, sửa, xóa | — | ✓ |
| API cleanup (chỉ ở môi trường dev) | — | ✓ |

Mọi tài khoản đăng nhập đều xem được thông báo của mình. Thông báo được lọc theo người nhận, role và chi nhánh.

## Quy tắc đáng chú ý

- Quyền MANAGER không tự động bao gồm quyền của STAFF. MANAGER không bán vé tại quầy, không hủy đơn của người khác.
- Duyệt hoàn tiền chỉ dành cho ADMIN và MANAGER đúng chi nhánh. Tài khoản xử lý phải còn ACTIVE.
- MANAGER chỉ thấy phim có suất chiếu ở chi nhánh mình trong danh sách phim quản lý.
- Tài khoản `BLOCKED` không đăng nhập được. Tài khoản `BLOCKED` hoặc `INACTIVE` không được cấp token mới khi refresh.
- Phim có `isPublic = false` chỉ ADMIN thấy. Các vai trò khác nhận lỗi "không tồn tại".

## Route công khai ở backend

`SecurityConfig` cho phép gọi không cần token:

- `POST /sign-up`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`.
- `/oauth2/**`, `/login/oauth2/**` (Google OAuth2).
- `GET /v1/vnpay/return`, `GET /v1/vnpay/ipn` (VNPay gọi).
- `/ws/**` (SockJS).
- `GET` dưới `/movie`, `/showtime`, `/ticket/showtime`, `/genre`, `/director`, `/food`, `/branch`, `/room`, và `POST /user`.

Route công khai ở filter vẫn có thể bị `@PreAuthorize` chặn. Ví dụ `GET /showtime/today` cần ADMIN hoặc STAFF, `GET /room/**`, `GET /food/all`, `GET /branch/{id}` cần ADMIN hoặc MANAGER, `POST /user` cần ADMIN hoặc MANAGER. Quyền đầy đủ của từng endpoint nằm trong [endpoints.md](../04-api/endpoints.md).

Request gửi kèm Bearer token không hợp lệ bị trả 401 ngay cả ở route công khai, vì filter xác thực chạy trước. Request không có header `Authorization` thì đi tiếp bình thường.

## Giao diện theo vai trò

| Khu | Guard | Vai trò vào được |
| --- | --- | --- |
| Trang công khai, chọn ghế | Không | Mọi người. Thao tác đặt vé vẫn cần đăng nhập. |
| `/profile`, `/my-bookings`, `/booking/:id/payment` | `PrivateRoute` | Đã đăng nhập |
| `/staff/*` | `StaffRoute` | STAFF, ADMIN |
| `/admin` và các trang con | `AdminRoute`, thêm `AdminOnlyRoute` cho `index`, `movies`, `showtimes`, `users`, `bookings`, `foods`, `promotions`, `settings` | ADMIN. MANAGER mở `/admin/*` được chuyển sang `/manager/*` tương ứng. |
| `/manager/*` | `AdminRoute` | MANAGER, ADMIN. `/manager/movies` và `/manager/settings` chuyển về `/manager`. |

Sau khi đăng nhập, `/` chuyển ADMIN về `/admin`, MANAGER về `/manager`, STAFF về `/staff/dashboard` (`roleHomePaths.js`).
