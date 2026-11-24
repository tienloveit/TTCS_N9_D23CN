# Kiến trúc frontend

> Đối chiếu mã nguồn ngày 2026-11-24, commit `afcb552`.

Mã nguồn ở `frontend/src/`. Ứng dụng là một SPA React 19 build bằng Vite 8, không dùng TypeScript, PostCSS hay Tailwind. CSS viết thuần.

## Thư viện

| Thư viện | Dùng cho |
| --- | --- |
| React 19, React DOM | Giao diện |
| React Router DOM 7 | Định tuyến, khai báo trong `AnimatedRoutes.jsx` |
| Axios | HTTP client và interceptor JWT |
| `@stomp/stompjs`, `sockjs-client` | Trạng thái ghế realtime |
| Framer Motion | Chuyển trang và hiệu ứng |
| Recharts | Biểu đồ dashboard và báo cáo |
| Lucide React | Icon, xuất tập trung qua `CinemaIcons.jsx` |
| React Toastify | Thông báo thao tác |
| jsQR, qrcode.react | Đọc QR từ camera, hiển thị QR vé và QR thanh toán |
| html-to-image, canvas-confetti | Tải ảnh vé, hiệu ứng khi đặt xong |
| write-excel-file | Tạo XLSX danh sách đơn ngay trên trình duyệt |

## Cấu trúc thư mục

```text
frontend/src/
├── main.jsx               Nạp tokens.css → index.css → components.css, mount <App>
├── App.jsx                ErrorBoundary, AuthProvider, BrowserRouter, ToastContainer
├── AnimatedRoutes.jsx     Khai báo route, guard, lazy load màn chọn ghế
├── api/
│   ├── axiosClient.js     Base URL, gắn token, refresh khi 401
│   └── index.js           Các nhóm API: authApi, bookingApi, vnpayApi...
├── context/
│   ├── AuthContext.jsx    AuthProvider: đọc token, login, logout, cờ role
│   ├── authContextValue.js, useAuth.js
│   └── roleHomePaths.js   Trang mặc định theo role
├── components/
│   ├── Common/            Button, Badge, CinemaIcons, ConfirmDialog, EmptyState, ErrorBoundary,
│   │                      SafeImage, Skeleton, BookingReceipt, PasswordField, useModalDialog
│   ├── Layout/, Navbar/   Khung trang khách
│   ├── MovieCard/         Thẻ phim
│   └── Ticket/            DigitalTicket (vé số)
├── pages/
│   ├── Home/, MovieList/, MovieDetail/, Branch/     Khám phá
│   ├── SeatSelect/, Payment/, MyBookings/, Profile/ Đặt vé và tài khoản khách
│   ├── Login/, Register/, NotFound/
│   ├── Admin/             Trang quản trị, dùng chung cho ADMIN và MANAGER
│   └── Staff/             Khu nhân viên: booking/ (bán vé), checkin/ (soát vé)
├── styles/
│   ├── tokens.css         Design token: màu, chữ, khoảng cách, bo góc, đổ bóng, z-index
│   └── components.css     Biến thể nút và badge
├── utils/
│   ├── cinemaTime.js      Thời gian theo giờ rạp
│   ├── cinemaFormats.js   Nhãn công nghệ phòng, định dạng chiếu
│   ├── bookingLimits.js   MAX_FOOD_QUANTITY = 50
│   ├── bookingStatus.js   Nhãn và tone Badge cho booking.status, dùng chung mọi màn
│   └── ageRatings.js      Danh mục phân loại độ tuổi P, K, T13, T16, T18
└── index.css              CSS chung
```

`frontend/tests/` chứa test Node, `frontend/scripts/check-design-tokens.mjs` kiểm tra mã màu hex. Xem [testing.md](../07-development/testing.md).

## Định tuyến và guard

| Nhóm | Đường dẫn |
| --- | --- |
| Công khai | `/`, `/movies`, `/movie/:id`, `/branches`, `/branch/:branchId`, `/showtime/:showtimeId/seats` |
| Xác thực | `/login`, `/register`, `/forgot-password`, `/oauth2/callback` |
| Cá nhân (`PrivateRoute`) | `/profile`, `/my-bookings`, `/booking/:bookingId/payment` |
| Kết quả thanh toán | `/payment/vnpay-return` |
| Nhân viên (`StaffRoute`) | `/staff/dashboard`, `/staff/booking`, `/staff/check-in`, `/staff/bookings`, `/staff/notifications` |
| Quản trị (`AdminRoute`) | `/admin` và `movies`, `showtimes`, `branches`, `users`, `bookings`, `foods`, `promotions`, `operations`, `refunds`, `revenue`, `audit-logs`, `notifications`, `settings` |
| Quản lý (`AdminRoute`) | `/manager` và `showtimes`, `branches`, `users`, `bookings`, `foods`, `promotions`, `operations`, `refunds`, `revenue`, `audit-logs`, `notifications` |

- `AdminRoute` nhận ADMIN và MANAGER. MANAGER mở `/admin/*` được chuyển sang `/manager/*` tương ứng, giữ query string, nên luôn dùng menu và phạm vi của khu quản lý.
- `AdminOnlyRoute` bọc thêm các trang `/admin` index, `movies`, `showtimes`, `users`, `bookings`, `foods`, `promotions`, `settings`.
- `/manager/movies`, `/manager/settings` chuyển về `/manager`. `/admin/staff-booking`, `/admin/check-in` (link cũ) chuyển sang `/staff/...`.
- `StaffRoute` nhận ADMIN và STAFF, không nhận MANAGER. Backend cho MANAGER soát vé nhưng frontend chưa có trang soát vé cho role này.
- `/` chuyển người dùng vận hành về trang mặc định theo role.

Bảng quyền đầy đủ ở [roles-permissions.md](../02-domain/roles-permissions.md#giao-diện-theo-vai-trò).

## Xác thực và gọi API

**AuthProvider** đọc `accessToken` trong localStorage, giải mã payload để lấy `sub`, `role`, `branchId`, và cung cấp `user`, `login`, `loginWithTokens`, `logout` cùng các cờ `isAdmin`, `isManager`, `isStaff`, `isStaffOrAdmin`, `isAdminOrManager`. Giá trị giải mã chỉ dùng để điều hướng giao diện. Backend luôn tự kiểm tra lại.

**axiosClient** ([axiosClient.js](../../frontend/src/api/axiosClient.js)):

- `baseURL` là `VITE_API_BASE_URL`, mặc định `http://localhost:8081/api`.
- Gắn `Authorization: Bearer <accessToken>` cho mọi request, trừ request có `skipAuth: true`.
- Khi nhận 401, thử lại request đó tối đa một lần. Nhiều request lỗi cùng lúc dùng chung một lần gọi `/auth/refresh` (biến `refreshRequest`). Phản hồi 401 đến muộn của request gửi bằng token cũ dùng lại token đã làm mới, không refresh thêm.
- Refresh thất bại thì xóa token và chuyển tới `/login`.
- Ngoại lệ: `POST /auth/change-password` trả 401 với `message = "Password incorrect"` được trả thẳng về form để người dùng nhập lại, không refresh.
- 403 không kích hoạt refresh.

`authApi.logout` dùng `skipAuth` và gửi cả `accessToken`, `refreshToken` trong body để backend kết thúc phiên refresh. Access token hết hạn không kích hoạt refresh lúc đăng xuất.

`OAuth2CallbackPage` nhận cặp token trong fragment URL do backend tạo (vẫn hỗ trợ query string kiểu cũ) rồi gọi `loginWithTokens`.

**API wrapper** trong [api/index.js](../../frontend/src/api/index.js) xuất `authApi`, `userApi`, `movieApi`, `genreApi`, `directorApi`, `branchApi`, `roomApi`, `seatApi`, `showtimeApi`, `ticketApi`, `foodApi`, `bookingApi`, `analyticsApi`, `operationsApi`, `reportsApi`, `notificationApi`, `auditLogApi`, `systemSettingsApi`, `staffApi`, `promotionApi`, `vnpayApi`. Trang không gọi `axios` trực tiếp. Kết quả đọc ở `response.data.result`. API xuất XLSX dùng `responseType: 'blob'`.

## Trạng thái

Ứng dụng không dùng thư viện quản lý state toàn cục. Dữ liệu nghiệp vụ được tải lại từ API khi vào trang.

| Nơi | Lưu gì |
| --- | --- |
| `AuthContext` | Người dùng hiện tại giải mã từ token |
| State của trang | Dữ liệu đã tải, lựa chọn đang làm, trạng thái tải và lỗi |
| URL | Rạp đang xem (`/branches?rap=<id>`), suất chọn sẵn ở quầy (`/staff/booking?showtime=<id>`), đơn đang mở (`/staff/bookings?booking=<id>`) |
| localStorage | `accessToken`, `refreshToken`; `movieptit.lastBranchId` (rạp xem gần nhất); `movieptit_cash_count_v1` (tiền đếm ở két theo ngày rạp); `movieptit_checkin_session_v1` (lịch sử soát vé của phiên) |

## Realtime

`SeatSelectPage` và `StaffBookingPage` tạo một `Client` STOMP với `SockJS(${API_BASE_URL}/ws)`, `reconnectDelay: 5000`, và đăng ký `/topic/showtime/{showtimeId}/seats`. Mỗi sự kiện cập nhật `displayStatus` của ghế tương ứng. Nếu ghế đang chọn chuyển khác `AVAILABLE`, trang bỏ ghế khỏi lựa chọn. Kết nối được đóng khi rời trang. Chi tiết payload và cách xử lý mất kết nối ở [realtime.md](../04-api/realtime.md).

## Thời gian

Backend trả `LocalDateTime` không kèm múi giờ. [cinemaTime.js](../../frontend/src/utils/cinemaTime.js) coi các giá trị này là giờ rạp `Asia/Ho_Chi_Minh`:

- `parseLocalDateTime`, `formatTime`, `formatDate`, `formatDateTime`, `formatCinema` (Intl tùy biến).
- `toCinemaDateKey`, `cinemaTodayKey`, `addDaysToDateKey` để xác định "hôm nay" theo giờ rạp.

Dùng các hàm này khi so sánh với thời điểm hiện tại. `new Date('2026-11-21T10:00:00')` hiểu chuỗi theo múi giờ của máy nên sai khi máy không ở UTC+7. `MyBookings/bookingFormat.js` tái xuất các hàm này.

## Màn hình chính

| Khu vực | Điểm vào | Ghi chú |
| --- | --- | --- |
| Khám phá phim | `Home/HomePage.jsx`, `MovieList/MovieListPage.jsx`, `MovieDetail/MovieDetailPage.jsx` | Danh sách lọc theo từ khóa, trạng thái, tuổi, thể loại. Chi tiết phim gom suất theo ngày và rạp, có đánh giá và trailer. |
| Lịch chiếu theo rạp | `Branch/BranchListPage.jsx`, `BranchSchedule.jsx` | Rạp đang chọn nằm trên URL và được nhớ ở localStorage. `/branch/:branchId` chỉ chuyển hướng. Ẩn suất đã bắt đầu. |
| Chọn ghế | `SeatSelect/SeatSelectPage.jsx` | Tải suất, vé, bắp nước, nghe STOMP, gọi `bookingApi.create`. Xem công khai, đặt vé cần đăng nhập. |
| Thanh toán | `Payment/PaymentPage.jsx`, `PaymentResultPage.jsx` | Đếm ngược theo `expiresAt` của backend. Thiếu `expiresAt` thì hiện cảnh báo, không tự ước tính. Áp hoặc bỏ mã, lấy URL VNPay. Trang kết quả gửi query string về backend và chỉ hiển thị kết quả backend xác nhận. |
| Vé của tôi | `MyBookings/MyBookingsPage.jsx`, `BookingCard.jsx`, `TicketPassModal.jsx`, `RefundDialog.jsx` | Suất sắp chiếu gần nhất nổi lên đầu và không lặp lại trong danh sách. Tab Sắp tới, Đã xem, Hoàn tiền, Đã hủy, Tất cả, mặc định Sắp tới nếu còn vé dùng được. Tab Tất cả xếp đơn cần xử lý lên trước, đơn hủy xuống cuối. Có tìm kiếm và phân trang. Điều kiện mở QR, thanh toán, hủy, hoàn tiền dùng chung trong `BookingCard`. `TicketPassModal` mở QR và tải ảnh vé, `bookingFormat.js` phân loại vé và đọc hạn hoàn, `bookingChanges.js` ghi nhận thay đổi khi làm mới. |
| Hồ sơ | `Profile/ProfilePage.jsx` | Chỉ gửi các trường của `UpdateProfileRequest`: `fullName`, `dob`, `phoneNumber`, `gender`, `email`. |
| Bán vé tại quầy | `Staff/booking/StaffBookingPage.jsx` | Ba bước `SELECTION` → `SEATS` → `CHECKOUT`. Trang cha giữ state, effect, STOMP và handler. Component con chỉ nhận props: `StaffShowtimeStep` (bộ lọc mặc định Hôm nay, dải "Sắp bắt đầu", bấm một lần mở sơ đồ ghế), `StaffSeatStep` (tab Sơ đồ ghế / Bắp nước, nút "Chọn nhanh"), `StaffAddonsStep`, `StaffCheckoutStep` (thông tin khách, phương thức thanh toán dạng radio, khối tiền mặt), `StaffReceiptSidebar` ("Phiếu bán vé" ở bước 1–2, "Tóm tắt đơn" có mã khuyến mãi ở bước thu tiền), `StaffVnpayPanel`, `StaffSaleComplete`. Hàm thuần ở `staffBookingUtils.js`: định dạng, phiếu in, `TIME_FILTERS`, `pickAdjacentSeats` (cụm ghế trống liền số, cùng loại, ưu tiên hàng giữa), `formatStartsIn`, `seatFill`. `?showtime={id}` chọn sẵn suất rồi bỏ tham số khỏi URL. Mã khuyến mãi khả dụng tải một lần khi vào bước thu tiền, `appliedPromo` là mã backend đã xác nhận, `promoCode` chỉ là ô nhập. Tra cứu khách gọi `staffApi.lookupCustomer` lúc rời ô và trước khi thu tiền, đổi SĐT/email xóa xác nhận. VNPay tại quầy hỏi `bookingApi.getById` mỗi 3 giây: `COMPLETED`/`PAID` thì xuất vé, `CANCELLED`/`EXPIRED`/`REFUND_REQUESTED` thì báo không hoàn tất. |
| Soát vé | `Staff/checkin/CheckInPage.jsx` | Giữ state, camera (jsQR) và gọi API. Giao diện tách ở `CheckInScannerTab`, `CheckInLookupTab`, `CheckInVerdictPanel`, `CheckInHistoryLog`, hàm định dạng và phiên soát lưu localStorage ở `checkInUtils.js`. Tab tra cứu gọi `bookingApi.search` (đơn `COMPLETED`/`PAID`, từ khóa, `showtimeDate` hôm nay khi lọc Hôm nay, tối đa 25 đơn). Lúc mở trang, lịch sử phiên được bổ sung từ đơn có vé soát hôm nay (`checkedInDate`). |
| Dashboard nhân viên | `Staff/StaffDashboardPage.jsx` | Tự làm mới mỗi 60 giây khi tab đang hiện, chỉ nhận phản hồi của lần gọi mới nhất. Thao tác nhanh; chỉ số doanh thu và vé bán của nhân viên, check-in theo chi nhánh (không ghép thành tỷ lệ với vé bán); suất kế tiếp kèm đếm ngược và mức lấp đầy (`availableSeats` chỉ đếm ghế trống); khối "Cần xử lý" (đơn `PENDING` trong `recentBookings` đếm ngược theo `expiresAt`, cộng số `refundRequests`); đối soát két. Nút "Bán vé suất này" mở `/staff/booking?showtime={id}`. `Staff/useNow.js` là đồng hồ dùng chung cho dashboard và màn bán vé. |
| Quản lý đơn | `Admin/BookingManagement.jsx` | Dùng chung cho ADMIN, MANAGER và STAFF. 15 đơn mỗi trang, ô tìm kiếm chờ 300 ms. Dòng đã chọn giữ qua các trang để xuất XLSX trên trình duyệt. Có nút "Yêu cầu hoàn thay khách" cho đơn tại quầy. |
| Phim và suất chiếu | `Admin/MovieManagement.jsx`, `MovieForm.jsx`, `ShowtimeManagement.jsx` | Upload poster/banner qua `POST /movie/media`. Lịch suất theo ngày/phòng và chế độ danh sách. |
| Hoàn tiền | `Admin/RefundManagementPage.jsx` | Chỉ báo thành công khi đơn trả về `REFUNDED`. |
| Báo cáo | `Admin/AdminDashboard.jsx`, `RevenueReportPage.jsx`, `OperationsReportPage.jsx` | XLSX tải dạng blob từ backend. |

## Thành phần dùng chung

| Thành phần | Cách dùng |
| --- | --- |
| `Button` | `variant` primary, secondary, ghost, danger, ghost-danger. `size` xs, sm, md, lg. `to` để render `Link`. Nút chỉ có icon phải có `aria-label`. |
| `Badge` | `tone` neutral, success, warning, danger, info, brand. `dot` để hiện chấm. Tone của trạng thái đơn lấy từ `BOOKING_STATUS_META` trong `utils/bookingStatus.js`, không khai báo lại trong từng trang. |
| `PasswordField` | Ô mật khẩu có nút hiện/ẩn (vùng bấm 40px, tên nút theo trạng thái), nhãn gắn `htmlFor`/`id`. Dùng cho đăng nhập, đăng ký, quên mật khẩu. |
| `useModalDialog(open, onClose, { disabled })` | Trả `overlayProps`, `contentProps`, `titleId` để gắn vào `.modal-overlay`, `.modal-content`. Xử lý Esc (chỉ modal trên cùng), giữ Tab trong modal, focus phần tử đầu, trả focus khi đóng, chỉ đóng khi nhấn và thả chuột đều ở nền. Modal sơ đồ ghế truyền `disabled: true`. |
| `ConfirmDialog`, `EmptyState`, `Skeleton`, `SafeImage`, `ErrorBoundary`, `BookingReceipt` | Hộp xác nhận, trạng thái rỗng, khung đang tải, ảnh có ảnh dự phòng, bắt lỗi render, phiếu thanh toán. |
| `StaffUI.jsx` | `StaffPageHeading`, `StaffState`, `StaffSkeleton`, `StaffChips` (nhóm nút lọc chọn một, dùng `aria-pressed`). |
| `Admin.css` | Modal: `.modal-content.admin-modal`, `admin-modal--md` (650px), `admin-modal--lg` (700px), `admin-modal-header`. Form: `admin-form`, `admin-form-row` (2–3 trường một hàng, tự xuống dòng), `admin-form--grid` với `span-full`, `admin-form-actions`, `admin-check`, `admin-choice-group`/`admin-choice` (radio dạng thẻ), `required-mark`, `admin-detail-grid` (thông tin chỉ đọc), `admin-notice`. Bảng: `admin-table`, `admin-table-card` (cuộn ngang, thanh công cụ đứng yên), `admin-table-empty`, `cell-index`, `cell-strong`, `cell-truncate`. Lọc: `admin-toolbar-filters`, `admin-search`, `input-sm`, `input-auto`. `Button` chỉ có icon tự thêm `btn-icon-only`. Mẫu tham chiếu: `BranchManagement.jsx`, `FoodManagement.jsx`, `UserManagement.jsx`, `PromotionManagement.jsx`, `RefundManagementPage.jsx`. |
| `index.css` | CSS chung, gồm `.modal-close--inline` (nút đóng trong header modal form) và `.input-leading-icon` (icon trong ô tìm kiếm). Class `pos-receipt-*`, `pos-seat-chip` thuộc `components/Common/BookingReceipt.css`. |

## CSS

- Token nằm trong `src/styles/tokens.css`. Khu `/admin` và `/manager` chỉ đổi `--accent` sang `--ops` trong `Admin.css`. Khu nhân viên dùng nhóm `--staff-*`.
- CSS khu nhân viên chia theo màn: `Staff/StaffPortal.css`, `Staff/booking/StaffBooking.css` (class `counter-*`, `staff-vnpay-*`, `staff-sale-*`), `Staff/checkin/CheckIn.css` (class `gate-*`). Mỗi trang tự import file của mình.
- CSS được gộp chung toàn ứng dụng, nên class dùng chung với trang khách (`.seat-legend`, `.food-option`...) phải viết kèm class cha của khu đang sửa.

Quy tắc viết CSS, icon và component nằm trong [coding-conventions.md](../07-development/coding-conventions.md#frontend).
