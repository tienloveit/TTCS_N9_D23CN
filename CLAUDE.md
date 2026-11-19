# MoviePTIT — Context toàn dự án

Đối chiếu mã nguồn ngày **2026-11-19** tại commit `9d84c88`. MoviePTIT là hệ thống đặt vé rạp phim gồm website khách hàng, quầy bán vé và khu quản trị.

- [README](README.md) hướng dẫn cài đặt, cấu hình, chạy và tạo dữ liệu demo.
- [Context backend](backend/CLAUDE.md) mô tả REST API, quyền, dữ liệu, transaction, tích hợp và migration.
- [Context frontend](frontend/CLAUDE.md) mô tả route, màn hình, Axios, realtime và kiểm tra.
- [Hướng dẫn làm việc cho AI](AGENTS.md) áp dụng ở gốc repo và dẫn đến quy tắc riêng của từng phần.

## Kiến trúc và điểm vào

| Phần | Nơi bắt đầu | Runtime mặc định |
| --- | --- | --- |
| Frontend | [main.jsx](frontend/src/main.jsx) → [App.jsx](frontend/src/App.jsx) → [AnimatedRoutes.jsx](frontend/src/AnimatedRoutes.jsx) | React 19, Vite 8, React Router 7, `http://localhost:5173` |
| HTTP client | [axiosClient.js](frontend/src/api/axiosClient.js), [các nhóm API](frontend/src/api/index.js) | `VITE_API_BASE_URL`, mặc định `http://localhost:8081/api`. Vite gọi trực tiếp backend |
| Backend | [BackendApplication.java](backend/src/main/java/com/ltweb/backend/BackendApplication.java), [application.yaml](backend/src/main/resources/application.yaml) | Java 21, Spring Boot 3.4.0, Spring Security, JPA/JDBC, MapStruct |
| Dữ liệu | [movie.sql](backend/movie.sql), [migrations](backend/migrations), entity và repository | MySQL 8, schema `cinema`, Redis cho JWT, OTP và khóa ghế |
| Realtime | `WebSocketConfig`, `TicketService`, `SeatSelectPage`, `StaffBookingPage` | SockJS tại `${API_BASE_URL}/ws`, STOMP topic `/topic/showtime/{showtimeId}/seats` |
| Tích hợp | Security/OAuth2, `VnpayService`, `VnpayRefundGateway`, `EmailService` | Google OAuth2, VNPay sandbox, Gmail SMTP, ZXing cho QR |

Các thư mục `backend/` và `frontend/` nằm trực tiếp dưới gốc repo. Lệnh Maven chạy trong `backend/`, lệnh npm và Node tests chạy trong `frontend/`. Mỗi phần có mẫu cấu hình `.env.example`.

## Vai trò

| Vai trò | Giao diện chính | Phạm vi nghiệp vụ |
| --- | --- | --- |
| USER | Trang công khai, `/profile`, `/my-bookings` | Đặt vé, thanh toán, vé QR, hủy đơn chờ và yêu cầu hoàn tiền cho đơn của mình, đánh giá phim |
| STAFF | `/staff` | Bán vé, check-in, tra cứu đơn và dashboard theo phạm vi backend |
| MANAGER | `/manager` | Suất chiếu, phòng/chi nhánh, người dùng, bắp nước, khuyến mãi, hoàn tiền và báo cáo thuộc chi nhánh theo quyền từng API |
| ADMIN | `/admin`, có thể vào `/staff` | Quản trị toàn hệ thống, danh mục phim, cấu hình và nghiệp vụ vận hành |

Route guard điều hướng giao diện. Backend xác thực JWT, kiểm tra role bằng `SecurityConfig` và method security, rồi áp dụng quy tắc chủ sở hữu/chi nhánh trong service. Ví dụ backend cho MANAGER check-in đúng chi nhánh, trong khi route `/staff/check-in` nhận STAFF và ADMIN.

## Luồng liên tầng

1. **Đăng nhập**. UI lưu cặp access/refresh token, Axios gắn Bearer token. Các request 401 đồng thời dùng chung một lần refresh. Backend phân loại token bằng `token_use` và tiêu thụ refresh token một lần bằng Redis.
2. **Tìm suất chiếu**. Khách đi từ phim hoặc chi nhánh đến suất chiếu. `ShowtimeService` tạo ticket cho từng ghế trong phòng khi tạo suất. Công nghệ phòng và định dạng chiếu là hai thuộc tính riêng.
3. **Đặt và thanh toán**. Backend tính giá, kiểm tra quyền/phạm vi, khóa ticket trong DB và giữ ghế ở Redis theo mã booking. Đơn online chờ VNPay, tiền mặt tại quầy có thể hoàn tất ngay. `BookingPaidEvent` dẫn tới cập nhật hạng thành viên và gửi vé sau commit.
4. **Hủy và hết hạn**. Backend trả ghế và hoàn tồn bắp nước cho đơn chờ bị hủy/hết hạn. Job dọn hết hạn chạy mỗi 120 giây. TTL giữ ghế mặc định 6 phút, giới hạn mặc định 8 vé mỗi giao dịch.
5. **Check-in và hoàn tiền**. Check-in ghi người và thời điểm quét. Khách gửi yêu cầu hoàn trong thời hạn backend trả về. ADMIN hoặc MANAGER đúng chi nhánh xử lý, và giao diện chỉ báo hoàn tất khi backend trả `REFUNDED`.
6. **Vận hành**. Dashboard nhân viên, dashboard quản trị, báo cáo doanh thu/vận hành, đơn hàng, thông báo và nhật ký dùng các API riêng. XLSX báo cáo được tạo ở backend, XLSX danh sách đơn được tạo ở trình duyệt.

## Hợp đồng dùng chung

| Chủ đề | Hợp đồng hiện tại |
| --- | --- |
| JSON | Phần lớn API trả `ApiResponse<T>`, frontend đọc `data.result`. Callback/IPN, tệp và XLSX có hợp đồng riêng. |
| ID | PK đơn là `id` trong DB. JSON có thể dùng `bookingId`, `showtimeId` hoặc `notificationId` theo DTO. |
| Đơn và thanh toán | `Booking` liên kết một-một với `Payment`. `BookingResponse` vẫn trả các trường thanh toán/hoàn tiền ở cấp ngoài. Người bán là `staffUser`, lưu ở `booked_staff`. |
| Phim | `isPublic` điều khiển hiển thị, cùng các trạng thái `UPCOMING`, `NOW_SHOWING`, `ENDED`. |
| Giá và định dạng | `Showtime.ticketPrice` dùng chung cho suất, `Ticket.price` giữ giá của vé. `roomTechnology` và `screeningFormat` độc lập. |
| Ghế và vé | `Seat` có `STANDARD`, `VIP`, `COUPLE`. Vé có `AVAILABLE`, `HOLDING`, `BOOKED`. Check-in được biểu diễn bằng `checkedInAt` và `checkedInBy`. |
| Thời gian | Backend dùng `Clock` theo `Asia/Ho_Chi_Minh` trong các luồng nghiệp vụ đã inject clock. UI lịch sử vé và thanh toán dùng tiện ích thời gian rạp, một số màn hình có formatter riêng. |
| Quyền và chi phí | Backend quyết định quyền, giá, hạn giữ ghế, tồn bắp nước và thời hạn hoàn. UI hiển thị hoặc ước tính trong khi chờ dữ liệu chính thức. |

Seed khi khởi động và API cleanup mặc định tắt. Cách bật trên database demo và phạm vi reset có trong [README](README.md#dữ-liệu-demo). Với database cũ, xem [thứ tự và điều kiện áp dụng migration](backend/CLAUDE.md#migration-và-kiểm-tra).

## Tra cứu mã nguồn

GitNexus đăng ký repo `TTCS_N9_D23CN`. Các luồng điển hình để đối chiếu gồm `applyPromotion` từ controller tới booking/payment, `processRefund` và `prepare` cho hoàn tiền, và `resetPassword` tới `OTPService.checkOTP`. Dùng kết quả đồ thị cùng mã nguồn, đặc biệt ở đoạn nối HTTP, Spring annotation và callback từ trình duyệt.
