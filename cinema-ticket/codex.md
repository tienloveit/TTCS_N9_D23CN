# Codex Project Context

Last refreshed: 2026-06-17

This file is the working context for the `cinema-ticket` / MoviePTIT project. It is meant to help Codex or a developer quickly understand the repo before making changes. The backend notes below were refreshed from the current source tree on 2026-06-17 and should be treated as the most authoritative part of this document.

## Project Summary

`cinema-ticket` is a full-stack cinema booking app branded in the UI as MoviePTIT. It has:

- A Spring Boot backend under `backend/`.
- A Vite + React frontend under `frontend/`.
- MySQL persistence.
- Redis for refresh-token state, access-token blacklist state, OTPs, realtime seat holds, and AI chat memory.
- WebSocket/STOMP for realtime seat status.
- VNPay sandbox integration for online payment and refund functionality.
- Spring AI chat integration pointed at an OpenAI-compatible Gemini endpoint.
- Google OAuth2 authentication.

The app supports public movie/branch browsing, showtime lookup, seat selection, concession combos, discount promotions, online booking/payment, user booking history, user membership tiers, admin CRUD screens, dashboard analytics, staff counter booking, ticket QR/check-in, movie ratings, password reset OTP email, seeded demo data, and a public AI chat helper backed by domain tools.

## Repository Layout

```text
.
|-- README.md
|-- codex.md
|-- backend/
|   |-- pom.xml
|   |-- seed-data.ps1
|   |-- src/main/resources/application.yaml
|   `-- src/main/java/com/ltweb/backend/
|       |-- BackendApplication.java
|       |-- config/
|       |-- controller/
|       |-- dto/
|       |-- entity/
|       |-- enums/
|       |-- event/
|       |-- exception/
|       |-- job/
|       |-- mapper/
|       |-- repository/
|       |-- service/
|       `-- util/
`-- frontend/
    |-- package.json
    |-- vite.config.js
    |-- index.html
    `-- src/
        |-- App.jsx
        |-- AnimatedRoutes.jsx
        |-- api/
        |-- components/
        |-- context/
        |-- pages/
        `-- index.css
```

## Local Runtime

Backend:

- Java 21.
- Spring Boot parent version: `3.4.0`.
- Spring AI BOM version: `1.0.0-M5`.
- Default server: `http://localhost:8081/api`.
- Data stores expected locally:
  - MySQL database `cinema` on `localhost:3306`.
  - Redis on `localhost:6379`.
- Main class: `backend/src/main/java/com/ltweb/backend/BackendApplication.java`.
- Useful commands from `backend/`:
  - `mvn -q spring-boot:run`
  - `mvn -q -DskipTests compile`
  - `mvn -q -DskipTests package`
  - `powershell -ExecutionPolicy Bypass -File .\seed-data.ps1`

Frontend:

- Vite + React.
- Default dev server: `http://localhost:5173`.
- API base URL: `VITE_API_BASE_URL`, fallback `http://localhost:8081/api`.
- Useful commands from `frontend/`:
  - `npm install`
  - `npm run dev`
  - `npm run build`
  - `npm run lint`

Configuration:

- `backend/src/main/resources/application.yaml` imports optional `.env` files from several local paths.
- Secrets and credentials are expected from env vars:
  - `SPRING_DATASOURCE_PASSWORD`
  - `SPRING_MAIL_USERNAME`
  - `SPRING_MAIL_PASSWORD`
  - `JWT_SECRET_KEY`
  - `VNPAY_TMN_CODE`
  - `VNPAY_SECRET_KEY`
  - `GEMINI_API_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Do not copy local secret values into docs, commits, tickets, or chat. The current YAML stores secret references, not literal secret values.

## Backend Stack

Core dependencies:

- Spring Boot Web MVC, Data JPA, JDBC, Validation.
- Spring Security OAuth2 Resource Server with a custom HS512 JWT decoder & Google OAuth2 Login.
- MySQL Connector/J.
- Redis via Spring Data Redis.
- WebSocket/STOMP.
- Java Mail.
- Lombok and MapStruct.
- ZXing for QR code generation and QR image reading.
- Spring AI OpenAI starter, configured to call Gemini through an OpenAI-compatible base URL.

Backend package pattern:

- `controller`: REST endpoints returning `ApiResponse<T>`.
- `service`: business logic, transactions, method security, auth checks.
- `repository`: Spring Data repositories and entity graphs.
- `entity`: JPA entities plus Redis token entity.
- `dto/request` and `dto/response`: API payloads.
- `mapper`: MapStruct mappers, usually `componentModel = "spring"`.
- `exception`: `AppException`, `ErrorCode`, `GlobalExceptionHandler`.
- `config`: security, CORS, WebSocket, Redis, JWT, VNPay, AI, application init, OAuth2 callbacks.
- `event`: `BookingPaidEvent`.
- `job`: scheduled cleanup for expired bookings.
- `util`: VNPay helper functions.

## Backend Configuration

Application:

- `server.port = 8081`
- `server.servlet.context-path = /api`
- JPA `ddl-auto = update`
- SQL logging enabled with `show-sql = true`
- Scheduling enabled by `@EnableScheduling`
- VNPay properties enabled by `@EnableConfigurationProperties(VnpayProperties.class)`

CORS origins allowed in `SecurityConfig`:

- `http://localhost:5173`, `5174`, `3000`
- `http://127.0.0.1:5173`, `5174`, `3000`

WebSocket:

- SockJS/STOMP endpoint: `/api/ws`
- Broker destination prefix: `/topic`
- Client application prefix: `/app`
- Seat status topic: `/topic/showtime/{showtimeId}/seats`

Spring AI:

- `spring.ai.openai.api-key = ${GEMINI_API_KEY}`
- `spring.ai.openai.base-url = https://generativelanguage.googleapis.com/v1beta/openai/`
- `spring.ai.openai.chat.options.model = gemini-2.5-flash`

## Backend Domains

### Identity And Auth

Entities:

- `User`: login identity and profile. Implements `UserDetails`. Fields include username, bcrypt password, full name, email, phone, DOB, gender, role, branchId, status, membershipTier, totalSpending, timestamps, bookings.
- `RedisToken`: Redis hash `redis_tokens` keyed by JWT ID with TTL. It is used both for refresh-token allow-list entries and blacklisted access-token IDs.

Enums:

- `UserRole`: `ADMIN`, `MANAGER`, `STAFF`, `USER`
- `UserStatus`: `ACTIVE`, `INACTIVE`, `BLOCKED`
- `Gender`: `MALE`, `FEMALE`, `OTHER`
- `MembershipTier`: `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`, `DIAMOND`

Flow notes:

- JWTs are signed with HS512.
- Access token lifetime is 30 minutes.
- Refresh token lifetime is 30 days.
- JWT `sub` is username.
- JWT `role` is one of the `UserRole` values.
- Google OAuth2 integrates with standard security context. Upon success, redirects to frontend OAuth callback.
- Login stores the refresh token JWT ID in Redis.
- Refresh requires the refresh JWT ID to exist in Redis, consumes it, and issues a new pair.
- Logout stores the access token JWT ID in Redis until token expiry, which makes future access-token verification fail.
- Password reset generates OTP stored in Redis.

### Movie Catalog

Entities:

- `Movie`: title, description, thumbnail/trailer, duration, age rating, language/subtitle, release/end dates, status, one director, many genres.
- `Director`: unique name, optional bio, one-to-many movies.
- `Genre`: many-to-many movies.
- `MovieRating`: unique `(movie_id, user_id)`, integer score with timestamps.

### Cinema Structure

Entities:

- `Branch`: branch code, name, address, city, phone, status.
- `Room`: belongs to branch. Has code, name, room type, seat capacity, status.
- `Seat`: belongs to room. Has row label, seat number, seat type, active flag, and now supports drag-and-drop layout metadata (seatGridPosition, etc.).
- `SeatTypePrice`: unique price row per `SeatType`.

Flow notes:

- `RoomService.createRoom()` saves a room and auto-generates seats from capacity.
- `DataSeedService` uses a fixed 5x10 layout per seeded room: rows A-B standard, C-D VIP, E couple.
- Added feature: **Drag-and-drop seat layout management** allows admins to reposition and adjust physical seating coordinates.

### Showtimes And Tickets

Entities:

- `Showtime`: room + movie + start/end time + status.
- `Ticket`: booking optional, showtime, seat, price, ticket status, QR code, check-in timestamp. Unique `(showtime_id, seat_id)`.

Realtime ticket state:

- `TicketService.getTicketsByShowtimeId()` reads DB tickets and Redis `seat_hold:{showtimeId}:{seatId}` keys.
- `displayStatus` is derived so Redis-held seats show as `HOLDING` even if DB state is different.

### Booking, Food, And Payment

Entities:

- `Booking`: booking code, user, showtime, total amount, booking status, expiry, payment fields, tickets, food lines, and discount amount.
- `BookingFood`: booking, food, quantity, unit price, subtotal.
- `Food`: concession item with name, description, price, image URL, stockQuantity, active flag.
- `FoodStockTransaction`: tracks inventory movements for foods (added/removed).
- `Promotion`: manages discount codes, min order limits, percentage vs fixed amount, expiry dates.

Enums:

- `PaymentStatus`: `PENDING`, `PAID`, `CANCELLED`, `REFUNDED`

Customer booking flow:

- Similar to previous flow but now integrates with `Promotion` for checking discount validation via `/promotion/validate` before finalizing amount.
- Food selection now respects inventory tracking if `stockQuantity` is present.

VNPay flow & Refund:

- `VnpayService.createPaymentUrl()` builds VNPay sandbox URL.
- Feature added: **VNPay Refund** (`POST /v1/vnpay/refund`) allows refunding a VNPay transaction if an admin or staff member triggers a cancellation or ticket return.

### Staff & Operations, Analytics, Audit

New additions to the application:

- `StaffSchedule`, `StaffShift`: Time tracking and shift scheduling for staff members.
- `SystemSetting`: Dynamic system configuration stored in DB.
- `AuditLog`: Tracking critical system actions (who, what, when, IP address).
- `Notification`: Push notifications/announcements for users and staff.
- **Reporting Controllers**: `AdminAnalyticsController`, `OperationsReportController`, `ReportExportController`, `RevenueReportController` supply aggregated stats for dashboards.

### AI Chat

- `ChatService` builds a Spring AI `ChatClient`.
- Chat uses Redis for `chat:memory:`.

## Domain Model Summary

Main persistent objects:

- `User`, `Movie`, `Director`, `Genre`, `MovieRating`, `Branch`, `Room`, `Seat`, `SeatTypePrice`, `Showtime`, `Ticket`, `Booking`, `BookingFood`, `Food`, `RedisToken`.
- **New additions**: `Promotion`, `FoodStockTransaction`, `StaffSchedule`, `StaffShift`, `SystemSetting`, `AuditLog`, `Notification`.

## API Surface

All backend paths below are relative to `http://localhost:8081/api`.

Auth/user:

- `POST /auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password`, `/sign-up`
- `GET /users`, `GET /users/{id}`, `PUT /users/{id}`, `DELETE /users/{id}`
- `PUT /users/{id}/status`
- `GET /my-info`, `PUT /my-info`

Movies/Cinema/Showtimes:

- `GET /movie`, `GET /branch`, `GET /room`, `GET /showtime`, `GET /seat`, etc.

Booking/payment/food/promotions:

- `GET /booking`, `POST /booking`, `POST /booking/staff`
- `POST /v1/vnpay/payment-url`, `GET /v1/vnpay/return`, `GET /v1/vnpay/ipn`, `POST /v1/vnpay/refund`
- `GET /food`, `POST /food`
- `GET /promotion`, `POST /promotion/validate`

Staff/Admin/Analytics:

- `/admin/analytics/**`
- `/reports/**`
- `/staff/**`
- `/audit-log/**`
- `/notification/**`
- `/system-setting/**`

## API Response Shape

```json
{
  "code": 200,
  "message": "optional message",
  "result": {}
}
```

## Frontend Integration Notes

Frontend routes and behavior:

- Auth: `/login`, `/register`, `/forgot-password`, `/oauth2/callback`
- Admin: `/admin/*` includes movies, showtimes, branches, users, bookings, foods, promotions, audit logs, analytics.
- Staff: `/staff`, `/staff/booking`, `/staff/check-in`, `/staff/bookings`. 
  - Note: Staff Booking layout has been modified to mirror the customer's UI (5-step process, sidebar details) for consistency.
  - Note: Check-In page removed the manual QR upload button from the UI (but the backend endpoint `POST /ticket/check-in/qr-image` still exists).

## Testing State

- Same as before, relying on compilation and linting.

## Implementation Notes And Pitfalls

- When creating VNPay refunds, ensure the correct VNPAY properties and time formats are respected.
- `Promotion` discounts are evaluated server-side; always call `/promotion/validate` when cart changes.
- `User` now includes `membershipTier` and `totalSpending`, which can automatically affect promotions or point calculations in the future.
- Backend context path remains `/api`.
