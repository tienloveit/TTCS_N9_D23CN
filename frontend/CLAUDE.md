# MoviePTIT — Frontend Context

Đối chiếu mã nguồn ngày **2026-11-20** tại commit `685f713`. Xem [context toàn dự án](../CLAUDE.md), [context backend](../backend/CLAUDE.md) và [hướng dẫn AI cho frontend](AGENTS.md).

## Chạy frontend

Từ thư mục `frontend`:

```powershell
npm ci
npm run dev
```

Vite mặc định phục vụ tại `http://localhost:5173` nếu cổng còn trống. Đặt biến môi trường trong file `.env` của frontend khi cần đổi API:

```dotenv
VITE_API_BASE_URL=http://localhost:8081/api
```

`src/api/axiosClient.js` dùng URL trên làm mặc định nếu không có biến môi trường. `vite.config.js` không cấu hình proxy; backend cần cho phép CORS cho origin frontend. Cấu hình backend hiện liệt kê localhost/127.0.0.1 ở các cổng 5173, 5174, 3000.

```powershell
npm run build
npm run lint
npm run preview
```

Build tạo `dist/` (đã ignore, không commit); sửa `src/` rồi build lại khi cần. Frontend không dùng PostCSS hay Tailwind; CSS viết thuần trong `src/index.css` và file CSS theo màn hình. `.agents/skills/` chỉ giữ hai skill AI liên quan UI web: `ui-ux-pro-max` và `design-system`. `eslint.config.js` có override cho `CinemaIcons.jsx`: rule `react-refresh/only-export-components` chấp nhận HOC `withLucideDefaults`. `package.json` chưa khai báo script `test`. Thư mục `tests/` có `axiosClient.test.mjs` (interceptor JWT/refresh), `bookingFormat.test.mjs` (dữ liệu vé, thời gian rạp), `bookingManagement.test.mjs` (duyệt hoàn tiền chỉ báo thành công khi `REFUNDED`), `profile.test.mjs`, `cinemaTime.test.mjs` (giờ rạp không phụ thuộc múi giờ máy; nên chạy thêm với `TZ=UTC`) và `useModalDialog.test.mjs` (Esc, modal lồng nhau, click nền); `componentHarness.mjs` là bộ dựng component dùng chung. Chạy bằng Node test runner:

```powershell
node --experimental-vm-modules --test tests/*.test.mjs
```

## Stack và điểm vào

| Thành phần | Vai trò |
| --- | --- |
| React 19, Vite 8 | Giao diện và build |
| React Router DOM 7 | Routing trong `src/AnimatedRoutes.jsx` |
| Axios | API client và interceptor JWT |
| Framer Motion | Chuyển trang và hiệu ứng |
| Recharts | Biểu đồ dashboard/báo cáo |
| STOMP, SockJS | Trạng thái ghế realtime |
| Lucide React | Icon tập trung trong `CinemaIcons.jsx` |
| React Toastify | Thông báo thao tác |
| jsQR, qrcode.react | Đọc/hiển thị QR |
| html-to-image, canvas-confetti | Xuất hình và hiệu ứng giao diện |
| write-excel-file | Tạo XLSX danh sách đơn ngay trên trình duyệt |

- `src/main.jsx` nạp CSS chung và mount React. `src/App.jsx` bọc ErrorBoundary, AuthProvider, BrowserRouter và ToastContainer. `src/AnimatedRoutes.jsx` khai báo route, guard và lazy load màn chọn ghế.
- `src/api/index.js`: các nhóm API; `src/api/axiosClient.js`: base URL, token và refresh.
- `src/context/AuthContext.jsx`: `AuthProvider`; `authContextValue.js`, `useAuth.js`: context/hook; `roleHomePaths.js`: trang mặc định theo role.
- `src/components/`: layout và thành phần dùng lại; `src/components/Common/CinemaIcons.jsx`: icon chuẩn.
- `src/pages/`: màn hình khách, `Admin/`, `Staff/`; manager dùng lại nhiều trang Admin. Khu nhân viên dùng `StaffLayout.jsx`, `StaffInbox.jsx`, `StaffUI.jsx`. Bán vé tại quầy nằm trong `Staff/booking/`, check-in nằm trong `Staff/checkin/`; component con import `StaffUI` qua `../StaffUI`.
- `Staff/booking/StaffBookingPage.jsx` giữ toàn bộ state, effect, STOMP và handler. Giao diện từng bước nằm ở `StaffShowtimeStep`, `StaffSeatStep`, `StaffAddonsStep`, `StaffCheckoutStep` và `StaffReceiptSidebar` (cột hóa đơn). Các component này chỉ nhận props, không gọi API. Hàm thuần (định dạng, phiếu in, `TIME_FILTERS`) nằm ở `staffBookingUtils.js`.
- `Staff/checkin/CheckInPage.jsx` cũng giữ state, camera và gọi API. Giao diện tách thành `CheckInScannerTab`, `CheckInLookupTab`, `CheckInVerdictPanel` và `CheckInHistoryLog`; hàm định dạng và phiên check-in lưu ở localStorage nằm trong `checkInUtils.js`.
- `src/components/Common/`: `CinemaIcons`, `ConfirmDialog`, `EmptyState`, `ErrorBoundary`, `SafeImage`, `Skeleton`, `BookingReceipt`, `useModalDialog`; `components/Ticket/DigitalTicket.jsx` hiển thị vé số.
- `useModalDialog(open, onClose, { disabled })` trả `overlayProps`, `contentProps`, `titleId` để gắn vào `.modal-overlay`/`.modal-content` có sẵn. Hook xử lý Esc (chỉ modal trên cùng khi có modal lồng nhau), giữ Tab trong modal, focus phần tử đầu khi mở, trả focus khi đóng và chỉ đóng khi cả nhấn lẫn thả chuột đều ở nền. Modal form quản trị, `ConfirmDialog` và trailer phim dùng hook này. Modal sơ đồ ghế truyền `disabled: true` để không đóng ngoài ý muốn. `MovieForm` và `MyBookings/Dialogs.jsx` có cơ chế riêng.
- `src/utils/cinemaTime.js`: thời gian theo giờ rạp (`Asia/Ho_Chi_Minh`). `parseLocalDateTime` hiểu `LocalDateTime`/`LocalDate` của backend là giờ rạp; có `formatTime`, `formatDate`, `formatDateTime`, `formatCinema` (Intl tùy biến), `toCinemaDateKey`, `cinemaTodayKey`, `addDaysToDateKey`. Dùng các hàm này khi so sánh với thời điểm hiện tại hoặc xác định "hôm nay", vì `new Date(chuỗi không múi giờ)` dùng múi giờ của máy. `MyBookings/bookingFormat.js` tái export các hàm thời gian từ đây.
- `src/utils/cinemaFormats.js`: định dạng công nghệ phòng/định dạng chiếu; `src/index.css`: CSS chung, gồm `.modal-close--inline` (nút đóng trong header modal form) và `.input-leading-icon` (icon trong ô tìm kiếm).

## Auth và dữ liệu API

`AuthProvider` đọc access token từ localStorage, giải mã `sub`, `role`, `branchId`, cung cấp `user`, `login`, `loginWithTokens`, `logout` và các cờ role. Token pair lưu ở `accessToken`, `refreshToken`.

Axios gắn Bearer token trừ request có `skipAuth`. Khi gặp 401, interceptor thử lại tối đa một lần cho request đó. Các request lỗi đồng thời dùng chung một lần gọi `/auth/refresh`, lưu token pair mới và gửi lại với access token mới; phản hồi 401 đến muộn cho token cũ dùng lại token đã cập nhật. Refresh thất bại thì xóa token và chuyển `/login`.

`OAuth2CallbackPage` nhận cặp token qua fragment URL do backend tạo và hỗ trợ query string cũ. Trường hợp đổi mật khẩu trả 401 với `Password incorrect`, Axios chuyển lỗi về form để người dùng nhập lại mật khẩu hiện tại.

Backend phân biệt `token_use=access|refresh`, refresh token chỉ dùng một lần. Request gửi kèm Bearer không hợp lệ (kể cả refresh token đặt vào header) bị trả `401` ngay cả ở route public. Với request thường, interceptor refresh rồi gửi lại. Request có `skipAuth` không gắn token nên không gặp trường hợp này. Thiếu role trả `403`, không kích hoạt refresh. Token cũ thiếu claim mới bị từ chối sau cập nhật backend, nên cần đăng nhập lại. API vẫn trả `accessToken`/`refreshToken` như trước.

Response controller thường được đọc qua `response.data.result`. API xuất báo cáo trả blob XLSX. Dù backend tách `Payment` thành entity riêng, các trường `paymentMethod`, `paymentStatus`, `paidAt` và hoàn tiền vẫn phẳng trong `BookingResponse`.

## Route và quyền giao diện

| Nhóm | Các đường dẫn hiện tại |
| --- | --- |
| Công khai | `/`, `/movies`, `/movie/:id`, `/branches`, `/branch/:branchId`, `/showtime/:showtimeId/seats` |
| Auth | `/login`, `/register`, `/forgot-password`, `/oauth2/callback` |
| Cá nhân | `/profile`, `/my-bookings`, `/booking/:bookingId/payment` |
| Kết quả thanh toán | `/payment/vnpay-return` |
| Staff | `/staff/dashboard`, `/staff/booking`, `/staff/check-in`, `/staff/bookings`, `/staff/notifications` |
| Admin | `/admin` và `movies`, `showtimes`, `branches`, `users`, `bookings`, `foods`, `promotions`, `operations`, `refunds`, `revenue`, `audit-logs`, `notifications`, `settings` |
| Manager | `/manager` và `showtimes`, `branches`, `users`, `bookings`, `foods`, `promotions`, `operations`, `refunds`, `revenue`, `audit-logs`, `notifications` |

- `/` điều hướng người dùng vận hành về trang mặc định theo role.
- `PrivateRoute` yêu cầu đăng nhập; màn chọn ghế có thể truy cập công khai, thao tác đặt vé vẫn cần auth phía backend.
- `AdminRoute` nhận ADMIN/MANAGER; `AdminOnlyRoute` giới hạn từng trang cho ADMIN. Dưới `/admin`, các trang index, `movies`, `showtimes`, `users`, `bookings`, `foods`, `promotions`, `settings` dùng `AdminOnlyRoute` (MANAGER bị chuyển về `/manager`). MANAGER mở bất kỳ đường dẫn `/admin/*` nào cũng được `AdminRoute` chuyển sang `/manager/*` tương ứng (giữ query string), nên luôn dùng menu và phạm vi của khu quản lý.
- `StaffRoute` nhận ADMIN/STAFF, không nhận MANAGER. Backend có quyền check-in cho MANAGER nhưng frontend hiện không có trang check-in riêng cho role này.
- `/manager/movies` và `/manager/settings` chuyển về `/manager`.
- Link cũ `/admin/staff-booking`, `/admin/check-in` chuyển sang staff.
- Không còn route ca trực, bàn giao, chấm công, lịch trực hoặc trang tồn kho riêng.

## Các nhóm API

`src/api/index.js` xuất `authApi`, `userApi`, `movieApi`, `genreApi`, `directorApi`, `branchApi`, `roomApi`, `seatApi`, `showtimeApi`, `ticketApi`, `foodApi`, `bookingApi`, `analyticsApi`, `operationsApi`, `reportsApi`, `notificationApi`, `auditLogApi`, `systemSettingsApi`, `staffApi`, `promotionApi`, `vnpayApi`.

Các endpoint đáng chú ý, tương đối với API base URL:

- Staff dashboard: `GET /staff/dashboard`; không còn API mở/chốt ca hoặc lịch trực trong `staffApi`.
- Báo cáo: `/admin/analytics/dashboard`, `/admin/operations/daily-report`, `/admin/reports/revenue`; xuất XLSX dưới `/admin/reports/export/`.
- Thông báo: `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`.
- Cấu hình: `GET /admin/settings`, `PUT /admin/settings/{settingKey}`.
- Ghế/phòng: `PUT /seat/room/{roomId}/layout`; suất chiếu nhận `ticketPrice`, `screeningFormat`, phòng dùng `roomTechnology`.
- Khuyến mãi/hoàn tiền: `/promotion/validate`, `/booking/{id}/apply-promotion`, `/booking/{id}/refund-request`, `/booking/{id}/refund-process`.
- Check-in ảnh: multipart `POST /ticket/check-in/qr-image`, tên field `qrImage`.

## Các màn hình và điểm nối nghiệp vụ

| Khu vực | Điểm vào và trách nhiệm |
| --- | --- |
| Khám phá phim | `Home/HomePage.jsx`, `MovieList/MovieListPage.jsx`, `MovieDetail/MovieDetailPage.jsx`, `components/MovieCard/`. Danh sách lọc theo từ khóa, trạng thái, tuổi và thể loại. Chi tiết phim gom suất theo ngày/rạp và hiển thị đánh giá, trailer. |
| Khám phá chi nhánh | `Branch/useActiveBranches.js` lấy danh sách đang hoạt động. `BranchSchedule.jsx` tải lịch theo chi nhánh và ngày qua `showtimeApi.getByBranch`. |
| Đặt vé online | `SeatSelectPage.jsx` tải suất, ghế và bắp nước, nghe STOMP và gọi `bookingApi.create`. Trang chọn ghế truy cập công khai, hành động đặt vé cần đăng nhập. |
| Thanh toán | `PaymentPage.jsx` tải booking, đếm ngược theo `expiresAt` của backend (parse theo giờ rạp, tính lại từ mốc hết hạn mỗi giây; không tự ước tính thời gian giữ ghế, thiếu `expiresAt` thì hiện cảnh báo và để backend kiểm tra khi thanh toán), lưu/bỏ mã bằng `bookingApi.applyPromotion`, rồi yêu cầu URL VNPay. `PaymentResultPage.jsx` gửi query params callback tới backend và hiển thị kết quả do backend xác nhận. |
| Vé của tôi | `MyBookingsPage.jsx` quản lý lịch sử, hủy đơn chờ, hoàn tiền và chi tiết vé. `bookingFormat.js` xử lý ngày giờ theo múi giờ rạp, phân loại vé và thời hạn hoàn. `bookingChanges.js` so sánh lần làm mới cho thông báo thay đổi. `BookingCard`, `RefundDialog`, `TicketPassModal`, `DigitalTicket` và `BookingReceipt` phục vụ hiển thị vé/phiếu. |
| Hồ sơ | `ProfilePage.jsx` tải/chỉnh thông tin cá nhân (gồm `dob`), đổi mật khẩu và hiển thị khuyến mãi. Gửi các trường hồ sơ có trong `UpdateProfileRequest`. |
| Quầy bán vé | Route `/staff/booking` dùng `pages/Staff/booking/StaffBookingPage.jsx`. Các bước chọn suất, chọn ghế, đồ ăn và thanh toán dùng dữ liệu API, nghe cùng topic ghế với khách và có chức năng in phiếu sau bán. UI thu tiền mặt với `CASH`. Nút VNPay dùng lựa chọn `CARD` ở bước tạo đơn rồi chuyển sang trang thanh toán chung. |
| Check-in và tra đơn | Route `/staff/check-in` dùng `pages/Staff/checkin/CheckInPage.jsx`. Màn hình nhận nhập mã, camera/jsQR hoặc ảnh QR gửi backend. `/staff/bookings?booking={id}` mở chi tiết đơn từ danh sách theo phạm vi được trả về. |
| Quản lý đơn | `BookingManagement.jsx` dùng chung cho ADMIN, MANAGER và STAFF. Tải danh sách từ backend rồi lọc, tìm kiếm, phân trang, chọn dòng và tạo XLSX bằng `write-excel-file` trên trình duyệt. |
| Quản lý phim và suất | `MovieManagement.jsx` dùng `MovieForm.jsx` cho bản nháp/công khai, upload poster/banner qua `POST /movie/media`. `ShowtimeManagement.jsx` có lịch theo ngày/phòng và chế độ danh sách. Quyền thao tác tùy role và API. |
| Dashboard và báo cáo | `AdminDashboard`, `RevenueReportPage`, `OperationsReportPage` dùng API riêng. Hai trang báo cáo tải XLSX dạng blob từ backend. `StaffDashboardPage` lấy dữ liệu quầy qua `staffApi.getDashboard`. |

## Trạng thái và hợp đồng đặt vé

Khách chọn suất chiếu/ghế/bắp nước → tạo booking → tới trang thanh toán → lấy URL VNPay → callback frontend → gọi backend xác nhận → hiển thị kết quả/vé. Ghế nhận sự kiện tại `/topic/showtime/{showtimeId}/seats` qua SockJS endpoint `http://localhost:8081/api/ws` với cấu hình mặc định.

Backend là nơi xác nhận giá, quyền chi nhánh, trạng thái ghế và khuyến mãi. Giữ ghế mặc định 6 phút, giới hạn mặc định 8 vé/giao dịch; cả hai là cấu hình backend. Đã bỏ giới hạn cộng dồn theo phim. Không hardcode giới hạn cũ vào UI.

Dashboard nhân viên thống kê doanh thu và đơn bán của nhân viên theo ngày; check-in và yêu cầu hoàn tiền có phạm vi chi nhánh. Tồn kho bắp nước vẫn được xử lý phía backend dù không có trang quản lý tồn kho riêng. `TicketStatus` chỉ có `AVAILABLE`, `HOLDING`, `BOOKED`; xác định check-in bằng `checkedInAt`.

Trang hoàn tiền chỉ báo duyệt thành công khi `BookingResponse.status=REFUNDED`. Với `refundGatewayStatus=PROCESSING|UNKNOWN`, hiển thị `refundGatewayMessage`, giữ đơn chờ xử lý, khóa từ chối và dùng nút “Kiểm tra kết quả”; backend chỉ query, không gửi lại lệnh hoàn tiền. FAILED cho phép thử lại. `refundProcessedAt` là lần xử lý gần nhất, không phải ngày hoàn tiền; `refundedAt` mới thể hiện ngày hoàn tất. Các trường này vẫn phẳng trong BookingResponse.
