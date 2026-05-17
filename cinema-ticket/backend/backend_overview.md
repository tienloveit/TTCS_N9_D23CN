# 🎬 Tổng quan Backend — CinemaPTIT

> **Stack:** Spring Boot 3.x · Spring Security (OAuth2 Resource Server / JWT) · Spring Data JPA · Redis · WebSocket (STOMP) · VNPay · Google Gemini AI · MySQL

---

## 1. Kiến trúc tổng thể

```
Client (React)
    │
    ├─ REST API (HTTP/JSON)  ──────► Spring Boot App (:8080)
    │                                       │
    └─ WebSocket (STOMP/SockJS) ──────────► │
                                            │
                          ┌─────────────────┼──────────────────┐
                          │                 │                  │
                        MySQL            Redis            External
                      (JPA/Hibernate)  (Token + Seat    (VNPay API,
                                        Lock + Chat     Google AI,
                                        Memory)          Gmail SMTP)
```

### Cấu trúc package chính

| Package | Mục đích |
|---------|---------|
| `entity` | JPA Entities — ánh xạ trực tiếp với bảng DB |
| `dto` | Request/Response objects — không expose Entity ra ngoài |
| `repository` | Spring Data JPA interfaces — truy vấn DB |
| `service` | Business logic — toàn bộ logic nghiệp vụ ở đây |
| `controller` | REST endpoints — nhận request, gọi service, trả response |
| `config` | Cấu hình hệ thống (Security, Redis, WebSocket, AI...) |
| `mapper` | Chuyển đổi Entity ↔ DTO (dùng MapStruct) |
| `enums` | Các kiểu liệt kê cố định |
| `exception` | Xử lý lỗi tập trung |
| `event` | Spring Application Events (bất đồng bộ) |
| `job` | Scheduled jobs (dọn dẹp booking hết hạn) |

---

## 2. Mô hình dữ liệu (Entity Diagram)

```
Director ──< Movie >── Genre        (Many-to-Many qua bảng movie_genres)
              │
              │ (1 phim - nhiều suất chiếu)
              ▼
Branch ──< Room ──< Showtime ──────> Movie
              │         │
              │         │ (1 suất chiếu - nhiều vé)
              │         ▼
              └──────< Seat >──< Ticket >──< Booking >──< User
                                                │
                                            BookingFood
                                                │
                                             Food
```

### Chi tiết từng Entity chính

#### `User` (bảng `users`)
```
id, username*, email*, phoneNumber*, password (BCrypt)
fullName, dob, gender (MALE/FEMALE/OTHER)
role: ADMIN | STAFF | USER
status: ACTIVE | BLOCKED
createdAt, updatedAt
```
> Implements `UserDetails` của Spring Security.  
> `isAccountNonLocked()` trả `false` nếu `BLOCKED`.

#### `Movie` (bảng `movies`)
```
id, movieName, description (TEXT), thumbnailUrl, trailerUrl
durationMinutes, ageRating (P/K/T13/T16/T18), language, subtitle
releaseDate, endDate
status: UPCOMING | NOW_SHOWING | ENDED | INACTIVE
director (ManyToOne) → Director
genres (ManyToMany) → Genre   [bảng trung gian: movie_genres]
```

#### `Room` (bảng `rooms`) — Unique: (branch_id, code)
```
id, code, name
roomType: TWO_D | THREE_D | IMAX | ...
seatCapacity
status: ACTIVE | INACTIVE | MAINTENANCE
branch (ManyToOne) → Branch
```

#### `Seat` (bảng `seats`) — Unique: (room_id, seat_code)
```
id, seatCode (vd: "A1"), rowLabel ("A"), seatNumber (1)
seatType: STANDARD | VIP | COUPLE | SWEETBOX
isActive: boolean
room (ManyToOne) → Room
```

#### `Showtime` (bảng `showtimes`)
```
id, startTime, endTime
status: UPCOMING | ONGOING | ENDED | CANCELLED
movie (ManyToOne) → Movie
room (ManyToOne) → Room
```

#### `Ticket` (bảng `tickets`) — Unique: (showtime_id, seat_id)
```
id, price (BigDecimal)
ticketStatus: AVAILABLE | HOLDING | BOOKED | CHECKED_IN | EXPIRED
qrCode (string: "CINEMAHUB|BOOKING=...|TICKET=...|SEAT=...")
checkedInAt: timestamp
booking (ManyToOne) → Booking [nullable — null khi chưa được đặt]
showtime (ManyToOne) → Showtime
seat (ManyToOne) → Seat
```

> **Quan trọng:** Mỗi cặp (showtime, seat) chỉ có **1 ticket duy nhất**.  
> Ticket được tạo sẵn khi khởi tạo Showtime (bởi `ShowtimeService`).

#### `Booking` (bảng `bookings`)
```
id, bookingCode (vd: "BK-20250508-AB12CD") — unique
totalAmount (BigDecimal)
status: PENDING | COMPLETED | CANCELLED
paymentMethod: CASH | CARD | VNPAY
paymentStatus: PENDING | PAID | CANCELLED
providerTxnId (mã giao dịch VNPay)
expiresAt (6 phút sau khi tạo — cho PENDING)
paidAt, paymentCreatedAt, createdAt, updatedAt
user (ManyToOne) → User
showtime (ManyToOne) → Showtime
tickets (OneToMany) → List<Ticket>
bookingFoods (OneToMany) → List<BookingFood>
```

#### `SeatTypePrice`
```
Giá vé theo loại ghế (STANDARD/VIP/COUPLE...)
Dùng bởi ChatService để báo giá vé cho AI chatbot
```

---

## 3. Bảo mật — JWT + Spring Security

### Cơ chế hoạt động

```
[Login] → AuthService.login()
    → AuthenticationManager.authenticate()  ← dùng BCrypt so password
    → Tạo accessToken (30 phút) + refreshToken (30 ngày) bằng JwtService
    → Lưu refreshToken vào Redis (key = jwtId, TTL = 30 ngày)
    → Trả về { accessToken, refreshToken }

[Request] → SecurityFilterChain
    → Bearer token được giải mã bởi JwtDecoderConfig
    → JwtDecoderConfig.decode() gọi JwtService.verifyToken()
        → Kiểm tra chữ ký HMAC-SHA512
        → Kiểm tra hết hạn
        → Kiểm tra jwtId KHÔNG có trong Redis (tức là chưa logout)
    → jwtAuthenticationConverter() đọc claim "role" → tạo ROLE_ADMIN / ROLE_STAFF / ROLE_USER

[Logout] → Lấy jwtId từ token → lưu vào Redis với TTL = thời gian còn lại
    → Từ đó token này bị coi là "đã thu hồi"

[Refresh] → Kiểm tra refreshToken có trong Redis không (phải có)
    → Xóa refreshToken cũ khỏi Redis
    → Tạo cặp token mới
```

### Phân quyền
| Endpoint | Quyền |
|----------|-------|
| `GET /movie/**`, `/showtime/**`, `/genre/**`... | Public |
| `POST /sign-up`, `POST /auth/login` | Public |
| `POST /chat` | Public (AI chatbot) |
| `POST /booking`, `GET /my-info` | Authenticated (bất kỳ role) |
| `POST /booking/staff` | ADMIN hoặc STAFF |
| `GET /users`, `DELETE /users/{id}` | ADMIN only |
| `PUT /users/{id}/status` | ADMIN only |

> Phân quyền dùng 2 cơ chế:
> 1. `SecurityConfig` — url-level với `requestMatchers`
> 2. `@PreAuthorize("hasRole('ADMIN')")` — method-level trong Service

---

## 4. Luồng đặt vé (Core Business Flow)

### 4a. Khách hàng đặt vé online (thanh toán VNPay)

```
1. Client chọn ghế → POST /booking
   BookingService.createBooking()
   ├── Lấy user hiện tại từ SecurityContext
   ├── Kiểm tra seatIds không trùng
   ├── Lấy Ticket theo (showtimeId, seatId) — phải AVAILABLE
   ├── Khoá ghế bằng Redis: SET seat_hold:{showtimeId}:{seatId} = userId (TTL 6 phút)
   │   Nếu SET thất bại → đã có người giữ → throw TICKET_NOT_AVAILABLE
   ├── Broadcast qua WebSocket /topic/showtime/{id}/seats → {seatId, "HOLDING"}
   ├── Tạo Booking (status=PENDING, expiresAt = now+6min)
   ├── Cập nhật Ticket: status = HOLDING, booking = booking
   └── Trả về BookingResponse (có bookingId)

2. Client redirect → POST /v1/vnpay/payment-url
   VnpayService.createPaymentUrl()
   ├── Tạo HMAC-SHA512 signature từ các params
   └── Trả về paymentUrl (link tới cổng VNPay)

3. User thanh toán trên cổng VNPay

4. VNPay redirect về frontend với params → Frontend gọi GET /v1/vnpay/return?...
   VnpayService.processReturnUrl()
   ├── Verify HMAC signature
   ├── Kiểm tra responseCode == "00" && transactionStatus == "00"
   ├── Tìm Booking theo txnRef (= bookingId)
   ├── Nếu thành công:
   │   ├── Booking: status=COMPLETED, paymentStatus=PAID
   │   ├── Ticket: status=BOOKED, tạo QR code
   │   ├── Broadcast WebSocket: "BOOKED"
   │   ├── Xóa Redis seat locks
   │   └── Publish BookingPaidEvent (→ gửi email xác nhận)
   └── Nếu thất bại: Booking=CANCELLED, Ticket=AVAILABLE
```

### 4b. Nhân viên đặt vé tại quầy (CASH)

```
POST /booking/staff
BookingService.createStaffBooking()
├── Tìm/tạo customer account (theo email/phone — auto-generate nếu chưa có)
├── Kiểm tra ghế AVAILABLE + không có Redis hold
├── Tạo Booking (status=COMPLETED, paymentStatus=PAID, paymentMethod=CASH)
├── Ticket: status=BOOKED, QR code được tạo ngay
├── Broadcast WebSocket: "BOOKED"
└── Publish BookingPaidEvent → gửi email xác nhận
```

### 4c. Nhân viên đặt vé bằng thẻ (CARD)

```
Tương tự CASH nhưng:
- Booking status=PENDING, paymentStatus=PENDING
- Ticket status=HOLDING (không có QR ngay)
- Không unlock Redis
- Tiếp tục luồng VNPay như 4a từ bước 2
```

---

## 5. WebSocket — Real-time trạng thái ghế

```
Client kết nối: ws://localhost:8080/ws (SockJS fallback)
Subscribe: /topic/showtime/{showtimeId}/seats

Khi có sự kiện:
Server broadcast: SeatStatusEvent { seatId, status }
Status values: "HOLDING" | "BOOKED" | "AVAILABLE"
```

**Prefix routing:**
- `/app/**` → Client gửi lên Server để xử lý
- `/topic/**` → Server broadcast xuống Client

---

## 6. Redis — 3 use-cases

| Key pattern | Giá trị | TTL | Mục đích |
|------------|---------|-----|---------|
| `seat_hold:{showtimeId}:{seatId}` | userId | 6 phút | Lock ghế khi đang đặt |
| `{jwtId}` (RedisToken) | — (chỉ key tồn tại) | = thời gian còn lại của token | Token blacklist (logout) |
| `{jwtId}` (refresh token) | — | 30 ngày | Verify refresh token hợp lệ |
| `chat:{sessionId}:messages` | List<Message> | — | Lưu lịch sử chat AI |
| `otp:{email}` | OTP string | 5 phút | OTP quên mật khẩu |

---

## 7. Các Service quan trọng

### `BookingService` (nghiệp vụ chính)
- `createBooking()` — khách đặt online
- `createStaffBooking()` — nhân viên đặt tại quầy
- `cancelBooking()` — huỷ booking PENDING
- Dùng `RedisTemplate` để lock ghế
- Dùng `SimpMessagingTemplate` để push WebSocket
- Dùng `ApplicationEventPublisher` để fire `BookingPaidEvent`

### `VnpayService` (thanh toán)
- `createPaymentUrl()` — tạo URL thanh toán có chữ ký HMAC-SHA512
- `processReturnUrl()` — xử lý callback từ VNPay (người dùng thấy)
- `processIpn()` — xử lý IPN callback từ VNPay server (server-to-server)
- **Idempotency**: chỉ update nếu booking chưa COMPLETED/CANCELLED

### `AuthService` (xác thực)
- `login()` → tạo access + refresh token
- `logout()` → blacklist access token trong Redis
- `refresh()` → kiểm tra refresh token trong Redis, cấp token mới
- `forgotPassword()` → tạo OTP, gửi email
- `resetPassword()` → kiểm tra OTP, đổi mật khẩu

### `JwtService` (token)
- Dùng thư viện **Nimbus JOSE JWT**
- Thuật toán: **HMAC-SHA512** (HS512)
- Access token: 30 phút | Refresh token: 30 ngày
- Claim quan trọng: `sub` (username), `role`, `jti` (jwtId — dùng cho blacklist)

### `ChatService` (AI Chatbot)
- Dùng Spring AI với Google Gemini (Flash model)
- `RedisChatMemory` lưu lịch sử chat theo sessionId
- `AiToolsConfig` đăng ký các "tools" (functions) mà AI có thể gọi:
  - Tìm phim đang chiếu / sắp chiếu
  - Xem suất chiếu theo phim / ngày / rạp
  - Lấy giá vé theo loại ghế
  - Xem menu đồ ăn
  - Tạo link đặt vé cho khách

### `EmailService` (email)
- Dùng Spring Mail + Gmail SMTP
- Gửi email xác nhận booking (HTML template) khi nhận `BookingPaidEvent`
- Gửi OTP quên mật khẩu

### `TicketService` (check-in)
- `checkIn()` — quét mã QR để check-in
  - Tìm ticket theo QR string
  - Kiểm tra status = BOOKED
  - Cập nhật: status = CHECKED_IN, checkedInAt = now
- `checkInByQRImage()` — upload ảnh QR để check-in (dùng `QRCodeReaderService`)

### `ShowtimeService` (suất chiếu)
- Khi tạo Showtime mới → **tự động tạo toàn bộ Ticket** cho tất cả ghế active trong phòng
- Ticket được khởi tạo với `ticketStatus = AVAILABLE` và `price` theo `SeatTypePrice`

---

## 8. Các Config quan trọng

### `SecurityConfig`
- Dùng **OAuth2 Resource Server** với JWT decoder tùy chỉnh (`JwtDecoderConfig`)
- CORS: cho phép `localhost:5173`, `5174`, `3000`
- Claim `"role"` trong JWT → prefix thành `ROLE_ADMIN`, `ROLE_STAFF`, `ROLE_USER`
- `@EnableMethodSecurity` → bật `@PreAuthorize` trên method

### `WebSocketConfig`
- Endpoint `/ws` (SockJS)
- Application prefix: `/app` (client gửi lên)
- Broker prefix: `/topic` (server push xuống)

### `AiRedisConfig`
- Cấu hình `ChatClient` của Spring AI
- `RedisChatMemory` làm memory advisor lưu lịch sử hội thoại
- System prompt định nghĩa vai trò chatbot là nhân viên hỗ trợ CinemaPTIT

### `RedisConfig`
- `RedisTemplate<String, String>` cho seat lock
- `RedisTokenRepository` (Spring Data Redis) cho token blacklist

### `ApplicationInitConfig`
- Chạy khi app khởi động
- Tự động tạo tài khoản ADMIN mặc định nếu chưa có

---

## 9. Event-Driven — BookingPaidEvent

```java
// Khi booking thanh toán thành công:
eventPublisher.publishEvent(new BookingPaidEvent(booking.getId()));

// BookingTicketEmailListener lắng nghe:
@EventListener
public void handleBookingPaid(BookingPaidEvent event) {
    // Tải booking từ DB
    // Gọi emailService.sendBookingConfirmation(booking)
}
```

> Tách rời logic gửi email khỏi BookingService/VnpayService → dễ test và maintain.

---

## 10. Error Handling

- Tất cả lỗi đều throw `AppException(ErrorCode)`
- `ErrorCode` là enum định nghĩa code + message cho mỗi loại lỗi
- `JwtAuthenticationEntryPoint` bắt `AuthenticationException` → trả JSON 401
- Global exception handler bắt `AppException` → trả `ApiResponse` với code lỗi

---

## 11. Scheduled Jobs

- `CleanupController` (hoặc Scheduler job): dọn dẹp booking PENDING đã hết hạn
  - Cập nhật trạng thái về CANCELLED
  - Giải phóng Ticket về AVAILABLE
  - Có endpoint `/api/v1/cleanup/**` (public) để có thể gọi từ bên ngoài (cron)

---

## 12. Luồng đọc code hiệu quả

```
Bắt đầu từ: entity/ → hiểu cấu trúc dữ liệu
    ↓
enums/ → hiểu các trạng thái
    ↓
repository/ → hiểu cách truy vấn DB
    ↓
service/ → hiểu business logic (ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT)
    ↓
controller/ → hiểu API endpoints
    ↓
config/ → hiểu cấu hình hệ thống
    ↓
dto/ → hiểu format request/response
```

> **Tips:** Khi đọc một feature mới, hãy đọc theo chiều dọc:
> Controller → Service → Repository → Entity
> (không đọc từng file riêng lẻ)
