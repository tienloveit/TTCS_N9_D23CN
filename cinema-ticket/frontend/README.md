# MoviePTIT — Frontend Context

Cập nhật: **2026-11-12**, theo mã nguồn working tree. Xem thêm [context toàn dự án](../codex.md) và [backend context](../backend/backend_overview.md).

## Chạy frontend

Từ thư mục `cinema-ticket/frontend`:

```powershell
npm install
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

Build tạo `dist/`; sửa `src/` rồi build lại khi cần. `package.json` chưa có test runner hoặc script `test`.

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

- `src/App.jsx`: cấu hình ứng dụng; `src/AnimatedRoutes.jsx`: route và guard.
- `src/api/index.js`: các nhóm API; `src/api/axiosClient.js`: base URL, token và refresh.
- `src/context/AuthContext.jsx`: `AuthProvider`; `authContextValue.js`, `useAuth.js`: context/hook; `roleHomePaths.js`: trang mặc định theo role.
- `src/components/`: layout và thành phần dùng lại; `src/components/Common/CinemaIcons.jsx`: icon chuẩn.
- `src/pages/`: màn hình khách, `Admin/`, `Staff/`; manager dùng lại nhiều trang Admin.
- `src/utils/cinemaFormats.js`: định dạng công nghệ phòng/định dạng chiếu; `src/index.css`: CSS chung.

## Auth và dữ liệu API

`AuthProvider` đọc access token từ localStorage, giải mã `sub`, `role`, `branchId`, cung cấp `user`, `login`, `loginWithTokens`, `logout` và các cờ role. Token pair lưu ở `accessToken`, `refreshToken`.

Axios gắn Bearer token trừ request có `skipAuth`. Khi gặp 401, interceptor thử refresh một lần cho request đó bằng `/auth/refresh`, lưu token pair mới và gửi lại request; refresh thất bại thì xóa token và chuyển `/login`.

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
- `AdminRoute` nhận ADMIN/MANAGER; `AdminOnlyRoute` giới hạn từng trang cho ADMIN.
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

## Luồng đặt vé và lưu ý

Khách chọn suất chiếu/ghế/bắp nước → tạo booking → tới trang thanh toán → lấy URL VNPay → callback frontend → gọi backend xác nhận → hiển thị kết quả/vé. Ghế nhận sự kiện tại `/topic/showtime/{showtimeId}/seats` qua SockJS endpoint `http://localhost:8081/api/ws` với cấu hình mặc định.

Backend là nơi xác nhận giá, quyền chi nhánh, trạng thái ghế và khuyến mãi. Giữ ghế mặc định 6 phút, giới hạn mặc định 8 vé/giao dịch; cả hai là cấu hình backend. Đã bỏ giới hạn cộng dồn theo phim. Không hardcode giới hạn cũ vào UI.

Dashboard nhân viên thống kê doanh thu và đơn bán của nhân viên theo ngày; check-in và yêu cầu hoàn tiền có phạm vi chi nhánh. Tồn kho bắp nước vẫn được xử lý phía backend dù không có trang quản lý tồn kho riêng. `TicketStatus` chỉ có `AVAILABLE`, `HOLDING`, `BOOKED`; xác định check-in bằng `checkedInAt`.

## Quy tắc UI

- Dùng Lucide qua `src/components/Common/CinemaIcons.jsx`; đăng ký export ở đây khi thêm icon.
- Không dùng emoji làm icon cho nút, menu, badge, header hoặc hành động.
- Không viết SVG/path tùy chỉnh trong trang/component; chỉ `MoviePTITLogoIcon` được dùng hình học SVG thương hiệu.
- Khi đổi API, đối chiếu DTO và mapper backend, các guard role, phạm vi chi nhánh và từng màn hình dùng trường đó.
