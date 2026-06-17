# Codex Project Context

Last refreshed: 2026-06-17

This file is the working context for the `cinema-ticket` / MoviePTIT project. It is meant to help Codex or a developer quickly understand the repo before making changes. The backend notes below were refreshed from the current source tree on 2026-05-14 and should be treated as the most authoritative part of this document.

## Project Summary

`cinema-ticket` is a full-stack cinema booking app branded in the UI as MoviePTIT. It has:

- A Spring Boot backend under `backend/`.
- A Vite + React frontend under `frontend/`.
- MySQL persistence.
- Redis for refresh-token state, access-token blacklist state, OTPs, realtime seat holds, and AI chat memory.
- WebSocket/STOMP for realtime seat status.
- VNPay sandbox integration for online payment, including Refunds.
- Google OAuth2 for social login.
- Spring AI chat integration pointed at an OpenAI-compatible Gemini endpoint.

The app supports public movie/branch browsing, showtime lookup, seat selection, concession combos, promotions/discounts, online booking/payment, user booking history, admin CRUD screens, staff operations (booking, check-in, shifts, schedules, analytics), ticket QR/check-in, movie ratings, password reset OTP email, seeded demo data, and a public AI chat helper backed by domain tools.

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
- Do not copy local secret values into docs, commits, tickets, or chat. The current YAML stores secret references, not literal secret values.

## Backend Stack

Core dependencies:

- Spring Boot Web MVC, Data JPA, JDBC, Validation.
- Spring Security OAuth2 Resource Server with a custom HS512 JWT decoder.
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
- `config`: security, CORS, WebSocket, Redis, JWT, VNPay, AI, application init.
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

- `User`: login identity and profile. Implements `UserDetails`. Fields include username, bcrypt password, full name, email, phone, DOB, gender, role, status, timestamps, bookings, branchId, membershipTier, and totalSpending.
- OAuth2 is supported via `Google` provider.
- `RedisToken`: Redis hash `redis_tokens` keyed by JWT ID with TTL. It is used both for refresh-token allow-list entries and blacklisted access-token IDs.

Enums:

- `UserRole`: `ADMIN`, `STAFF`, `USER`
- `UserStatus`: `ACTIVE`, `INACTIVE`, `BLOCKED`
- `Gender`: `MALE`, `FEMALE`, `OTHER`

Flow notes:

- JWTs are signed with HS512.
- Access token lifetime is 30 minutes.
- Refresh token lifetime is 30 days.
- JWT `sub` is username.
- JWT `role` is one of the `UserRole` values.
- Spring maps JWT `role` into `ROLE_*` authorities.
- `User.getAuthorities()` returns an empty list; API role checks use JWT authority mapping.
- Login stores the refresh token JWT ID in Redis.
- Refresh requires the refresh JWT ID to exist in Redis, consumes it, and issues a new pair.
- Logout stores the access token JWT ID in Redis until token expiry, which makes future access-token verification fail.
- `UserDetails` state matters for login: `BLOCKED` is locked, `INACTIVE` is disabled.

Password reset:

- Forgot password checks email existence, creates Redis keys `otp:limit:{email}` and `otp:code:{email}`, and sends mail.
- Rate limit is max 3 OTP generations per minute.
- OTP code TTL is 5 minutes.
- Reset verifies the Redis OTP, updates bcrypt password, then deletes the OTP key.

### Movie Catalog

Entities:

- `Movie`: title, description, thumbnail/trailer, duration, age rating, language/subtitle, release/end dates, status, one director, many genres.
- `Director`: unique name, optional bio, one-to-many movies.
- `Genre`: many-to-many movies.
- `MovieRating`: unique `(movie_id, user_id)`, integer score with timestamps.

Enums:

- `MovieStatus`: `UPCOMING`, `NOW_SHOWING`, `ENDED`, `INACTIVE`
- `AgeRating`: `P`, `K`, `T13`, `T16`, `T18`

Flow notes:

- `CreateMovieRequest.directorId` is required.
- `UpdateMovieRequest.directorId` can change the director.
- Movie reads use entity graphs for `genres` and `director`.
- Movie responses include average rating and rating count computed from `MovieRatingRepository`.
- Ratings are one per `(movie, user)` and are upserted.
- Deleting a movie deletes its ratings first, then deletes the movie.

### Cinema Structure

Entities:

- `Branch`: branch code, name, address, city, phone, status.
- `Room`: belongs to branch. Unique `(branch_id, code)`. Has code, name, room type, seat capacity, status.
- `Seat`: belongs to room. Unique `(room_id, seat_code)`. Has row label, seat number, seat type, active flag.
- `SeatTypePrice`: unique price row per `SeatType`.

Enums:

- `BranchStatus`: `ACTIVE`, `INACTIVE`
- `RoomStatus`: `ACTIVE`, `INACTIVE`, `MAINTENANCE`
- `RoomType`: `TWO_D`, `THREE_D`, `IMAX`, `FOUR_DX`
- `SeatType`: `STANDARD`, `VIP`, `COUPLE`

Flow notes:

- `RoomService.createRoom()` saves a room and auto-generates seats from capacity.
- Runtime room generation computes an approximate grid from capacity and assigns standard/VIP seats.
- `DataSeedService` uses a fixed 5x10 layout per seeded room: rows A-B standard, C-D VIP, E couple.
- `RoomService.updateRoom()` regenerates seats only if capacity changes and the room has no showtimes.
- `RoomRepository` uses entity graphs for branch data.

### Showtimes And Tickets

Entities:

- `Showtime`: room + movie + start/end time + status.
- `Ticket`: booking optional, showtime, seat, price, ticket status, QR code, check-in timestamp. Unique `(showtime_id, seat_id)`.

Enums:

- `ShowtimeStatus`: `OPEN`, `CLOSED`, `CANCELLED`
- `TicketStatus`: `AVAILABLE`, `HOLDING`, `BOOKED`

Flow notes:

- `ShowtimeService.createShowtime()` rejects overlapping schedules in the same room.
- Creating a showtime generates one ticket per room seat.
- Ticket price comes from `SeatTypePrice`.
- `ShowtimeService.delete()` blocks deletion if completed bookings exist.
- Deleting a showtime cancels pending bookings, releases their tickets, deletes all tickets for the showtime, then deletes the showtime.
- `ShowtimeRepository` fetches `room`, `room.branch`, and `movie` for showtime reads.
- `GET /showtime/branch/{branchId}?date=YYYY-MM-DD` returns a grouped list of maps by movie, not `ShowtimeResponse`.

Realtime ticket state:

- `TicketService.getTicketsByShowtimeId()` reads DB tickets and Redis `seat_hold:{showtimeId}:{seatId}` keys.
- `displayStatus` is derived so Redis-held seats show as `HOLDING` even if DB state is different.
- `BOOKED` tickets always display as booked.

### Booking, Food, And Payment

Entities:

- `Booking`: booking code, user, showtime, total amount, booking status, expiry, timestamps, payment fields, tickets, food line items.
- `BookingFood`: booking, food, quantity, unit price, subtotal.
- `Food`: concession item with name, description, price, image URL, active flag, timestamps.

Enums:

- `BookingStatus`: `PENDING`, `CANCELLED`, `EXPIRED`, `COMPLETED`
- `PaymentMethod`: `CASH`, `CARD`, `VNPAY`
- `PaymentStatus`: `PENDING`, `PAID`, `CANCELLED`

Customer booking flow:

- `POST /booking` requires an authenticated user.
- Request contains `showtimeId`, `seatIds`, and optional food lines.
- Duplicate seat IDs are rejected.
- Selected seats must map to `AVAILABLE` tickets for the showtime.
- Food IDs must exist and be active; duplicate food IDs or non-positive quantities are rejected.
- Each seat gets a Redis lock: `seat_hold:{showtimeId}:{seatId}` with a 6 minute TTL.
- Tickets are moved to DB status `HOLDING`.
- Booking is created as `PENDING`, `paymentStatus = PENDING`, `expiresAt = now + 6 minutes`.
- Booking code format is `BK-YYYYMMDD-XXXXXX`.
- WebSocket broadcasts `HOLDING` for every selected seat.

Staff booking flow:

- `POST /booking/staff` requires `ADMIN` or `STAFF`.
- The service rejects tickets that are not `AVAILABLE` or that have an active Redis hold.
- It creates or reuses a customer by email or phone; otherwise it creates a `guest_*` user.
- If `paymentMethod` is `CASH` or null:
  - Booking is `COMPLETED`, payment is `PAID`, tickets become `BOOKED`, QR codes are generated, seat locks are deleted, WebSocket broadcasts `BOOKED`, and ticket email is published after commit.
- If `paymentMethod` is `CARD`:
  - Booking remains `PENDING`, payment is `PENDING`, tickets become `HOLDING`, no QR/email is generated, and expiry is 6 minutes. No separate card settlement endpoint was found.

Cancel/cleanup:

- `DELETE /booking/{id}` cancels only `PENDING` bookings.
- Owners, staff, and admins can cancel if authorized by `BookingService`.
- Cancel sets booking `CANCELLED`, payment `CANCELLED` if it was pending, releases tickets to `AVAILABLE`, deletes Redis seat locks, and broadcasts `AVAILABLE`.
- `BookingCleanupJob.releaseExpiredBookings()` runs every 2 minutes.
- The cleanup job finds expired `PENDING` bookings, cancels them, releases tickets, broadcasts `AVAILABLE`, and now explicitly deletes Redis seat-hold keys.

VNPay flow:

- `VnpayService.createPaymentUrl()` builds a VNPay sandbox URL. Payment expiry is 6 minutes.
- The transaction reference is the booking ID when `bookingId` is supplied; otherwise it falls back to `orderId` or a random numeric value.
- VNPay return and IPN both verify checksum.
- IPN also validates amount against booking total.
- On payment success:
  - booking -> `COMPLETED`
  - payment -> `PAID`
  - payment method -> `VNPAY`
  - tickets -> `BOOKED`
  - QR values are generated
  - Redis seat holds are deleted
  - WebSocket broadcasts `BOOKED`
  - `BookingPaidEvent` is published for ticket email
- On payment failure/cancel:
  - booking -> `CANCELLED`
  - payment -> `CANCELLED`
  - tickets detach from booking and go back to `AVAILABLE`
  - Redis seat holds are deleted
  - WebSocket broadcasts `AVAILABLE`

Ticket email:

- `BookingPaidEvent` is handled after transaction commit by `BookingTicketEmailListener`.
- `EmailService.sendBookingTickets()` sends an HTML email with inline QR images.
- QR payload format currently starts with `CINEMAHUB|BOOKING=...|TICKET=...|SEAT=...`, even though the visible brand is MoviePTIT.


### Promotions
- `Promotion`: manages discount codes, usage limits, active dates.
- Validated via `POST /promotion/validate` before VNPay checkout.

### Staff Operations & Scheduling
- `StaffSchedule`: tracks staff shifts (startTime, endTime, position).
- `StaffShift`: tracks actual shift metrics (cash differences, revenue, status).

### System & Analytics
- `SystemSetting`, `AuditLog`, `Notification` support configuration and tracking.
- `/admin/analytics/**` and `/reports/**` provide data for dashboard charting.

### Check-In

Flow notes:

- `POST /ticket/check-in` requires `ADMIN` or `STAFF`.
- `POST /ticket/check-in/qr-image` accepts multipart field `qrImage`, decodes it with ZXing, then reuses the normal check-in flow.
- The plain check-in code can be:
  - numeric ticket ID
  - QR value containing `TICKET=...`
  - exact stored `Ticket.qrCode`
  - booking code
- Booking-code check-in checks every ticket in that booking.
- Only completed, paid bookings with booked tickets can check in.
- Existing check-ins are reported via `alreadyCheckedIn` while preserving `checkedInAt`.

### AI Chat

Endpoint:

- `POST /chat`
- Body: `chatId`, `message`
- Public in `SecurityConfig`.
- Empty messages return an `ApiResponse` with code `400`.

Implementation:

- `ChatService` builds a Spring AI `ChatClient`.
- System prompt identifies the assistant as a CinemaPTIT AI helper and injects `current_date`.
- Registered functions include movie search, showtimes, genre search, available seats, booking link helper, branch info, snack menu, now-showing/upcoming movies, ticket prices, branch showtimes, upcoming by branch, and current user booking history.
- `RedisChatMemory` uses Redis key prefix `chat:memory:` with 24 hour TTL and falls back to in-memory storage if Redis is unavailable.
- Chat retries AI calls up to 3 times for rate limit/quota errors.

Important caveats:

- `getMyBookingHistory` calls `BookingService.getMyBookingsList()`, which expects an authenticated Spring Security user. Because `/chat` is public, this tool can fail or return the fallback message if no auth context exists.
- The AI booking helper currently returns `http://localhost:5173/booking/{showtimeId}`. The known frontend seat route is `/showtime/:showtimeId/seats`, so verify the frontend route before relying on the generated link.

## Auth And Security

Security rules:

- Public:
  - `POST /sign-up`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`
  - `POST /chat`
  - VNPay return/IPN
  - `/v1/cleanup/**`
  - WebSocket `/ws/**`
  - public GET routes for movie, showtime, ticket by showtime, genre, director, food, branch, room
  - `POST /user` is permitted, but no matching controller was found; frontend uses `POST /sign-up`.
- All other requests require authentication unless method security allows/blocks more specifically.

Role and method security notes:

- User admin APIs are protected in `UserService`.
- Movie create/update/delete are admin-only.
- Genre, director, and food writes are admin-only through service-level `@PreAuthorize`.
- Room create/read/update/delete are admin-only.
- Showtime create/update are admin-only, today view is admin/staff, room showtimes are admin-only, delete is admin-only at service level.
- Ticket all/update/delete are admin-only; check-in is admin/staff.
- Booking list/update/staff create are admin/staff; customer create requires auth; booking read/cancel checks owner or staff/admin in service.
- Branch create/getById/update are admin-only in controller, but `DELETE /branch/{id}` currently lacks a role annotation in both controller and service. With current security it is authenticated-only.
- Seat type price create/update currently has no role annotation. With current security it is authenticated-only.

## Domain Model Summary

Main persistent objects:

- `User` owns bookings and provides login identity.
- `Movie` belongs to one `Director` and many `Genre` records.
- `MovieRating` belongs to one movie and one user, unique per pair.
- `Branch` has many rooms.
- `Room` belongs to one branch and has many seats.
- `Seat` belongs to one room and has a type.
- `SeatTypePrice` defines base ticket price by seat type.
- `Showtime` connects movie and room for a time interval.
- `Ticket` connects showtime and seat; it optionally belongs to a booking.
- `Booking` connects user and showtime; it owns booked tickets and food lines.
- `BookingFood` snapshots food quantity and price at booking time.
- `Food` is a soft-disabled concession catalog item.
- `RedisToken` stores token IDs with TTL in Redis.

Important uniqueness constraints:

- `users.username`, `users.email`, `users.phoneNumber`
- `directors.name`
- `branches.branch_code`
- `rooms`: `(branch_id, code)`
- `seats`: `(room_id, seat_code)`
- `seat_type_prices.seat_type`
- `tickets`: `(showtime_id, seat_id)`
- `movie_ratings`: `(movie_id, user_id)`
- `bookings.bookingCode`

## API Surface

All backend paths below are relative to `http://localhost:8081/api`.

Auth/user:

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /sign-up`
- `GET /users?page=1&size=10&username=&email=&phone=`
- `GET /users/{id}`
- `PUT /users/{id}`
- `DELETE /users/{id}`
- `PUT /users/{id}/status?status=ACTIVE|INACTIVE|BLOCKED`
- `GET /my-info`
- `PUT /my-info`

Movies/genres/directors:

- `GET /movie?movieName=`
- `GET /movie/now-showing`
- `GET /movie/upcoming`
- `GET /movie/{id}`
- `POST /movie`
- `PUT /movie/{id}`
- `DELETE /movie/{id}`
- `POST /movie/{id}/rating`
- `GET /movie/{id}/rating/my`
- `GET /genre`
- `GET /genre/{id}`
- `POST /genre`
- `PUT /genre/{id}`
- `DELETE /genre/{id}`
- `GET /director`
- `GET /director/{id}`
- `POST /director`
- `PUT /director/{id}`
- `DELETE /director/{id}`

Cinema structure:

- `GET /branch`
- `GET /branch/{id}`
- `POST /branch`
- `PUT /branch/{id}`
- `DELETE /branch/{id}`
- `GET /room?branchId=&status=`
- `GET /room/{id}`
- `POST /room`
- `PUT /room/{id}`
- `DELETE /room/{id}`
- `GET /seat/{id}`
- `GET /seat/room/{roomId}`
- `POST /seat`
- `PUT /seat/{id}`
- `DELETE /seat/{id}`
- `GET /seat-type-price`
- `POST /seat-type-price`
- `PUT /seat-type-price/{seatType}`

Showtimes/tickets:

- `GET /showtime`
- `GET /showtime/today`
- `GET /showtime/{id}`
- `GET /showtime/room/{roomId}`
- `GET /showtime/movie/{movieId}`
- `GET /showtime/branch/{branchId}?date=YYYY-MM-DD`
- `POST /showtime`
- `PUT /showtime/{id}`
- `DELETE /showtime/{id}`
- `GET /ticket`
- `GET /ticket/{id}`
- `GET /ticket/showtime/{showtimeId}`
- `PUT /ticket/{id}`
- `DELETE /ticket/{id}`
- `POST /ticket/check-in`
- `POST /ticket/check-in/qr-image` with multipart field `qrImage`

Booking/payment/food:

- `GET /booking`
- `GET /booking/{id}`
- `GET /booking/my-bookings/list`
- `GET /booking/my-bookings/{id}`
- `POST /booking`
- `POST /booking/staff`
- `PUT /booking/{id}`
- `DELETE /booking/{id}`
- `GET /food`
- `GET /food/all`
- `GET /food/{id}`
- `POST /food`
- `PUT /food/{id}`
- `DELETE /food/{id}`
- `POST /v1/vnpay/payment-url`
- `POST /v1/vnpay/querydr`
- `POST /v1/vnpay/refund`
- `GET /v1/vnpay/return`
- `GET /v1/vnpay/ipn`

AI/dev:

- `POST /chat`
- `DELETE /v1/cleanup/database`

## API Response Shape

Successful controller responses usually use:

```json
{
  "code": 200,
  "message": "optional message",
  "result": {}
}
```

Errors use `ErrorResponse` with:

```json
{
  "timestamp": "...",
  "code": 400,
  "error": "Bad Request",
  "message": "...",
  "path": "/api/..."
}
```

`GlobalExceptionHandler` handles custom `AppException`, validation errors, auth errors, access denied, missing headers, data integrity, and catch-all errors.

## Seed/Data Notes

At startup `ApplicationInitConfig` runs `DataSeedService.seedInitialData()`.

Seed behavior:

- Alters `users.role` to `VARCHAR(20)` when possible so `STAFF` fits.
- Upserts demo users.
- Upserts seat prices.
- Upserts foods.
- Upserts genres.
- Upserts directors.
- Upserts movies and assigns directors/genres.
- Upserts branches and rooms.
- Seeds a 5x10 seat grid for each seeded room.
- Seeds showtimes and tickets for now-showing movies from today through the next 3 days.

Demo users:

- `admin / admin@123`
- `staff / staff@123`
- `user / user@123`
- `user2 / user2@123`

Seed seat prices:

- `STANDARD`: `75000`
- `VIP`: `105000`
- `COUPLE`: `180000`

Seed branches:

- `CN-HCM-01`
- `CN-HCM-02`
- `CN-HN-01`
- `CN-DN-01`

There is also `backend/seed-data.ps1`, which waits for backend readiness, calls `DELETE /v1/cleanup/database`, logs in as admin, and creates demo data through APIs. Because the backend already seeds on startup, use the script only when a full reset/demo dataset is desired.

## Frontend Integration Notes

Frontend auth behavior:

- `frontend/src/context/AuthContext.jsx` decodes the access token from `localStorage`.
- `accessToken` and `refreshToken` are stored in `localStorage`.
- `frontend/src/api/axiosClient.js` attaches `Authorization: Bearer <token>`.
- A 401 response triggers `/auth/refresh`, stores the new pair, retries the original request, and redirects to `/login` if refresh fails.

Known frontend routes:

- Auth: `/login`, `/register`, `/forgot-password`, `/oauth2/callback`
- Admin: `/admin/*` includes movies, showtimes, branches, users, bookings, foods, promotions, audit logs, analytics.
- Staff: `/staff`, `/staff/booking`, `/staff/check-in`, `/staff/bookings`.
  - Note: Staff Booking layout has been modified to mirror the customer's UI (5-step process, sidebar details) for consistency.
  - Note: Check-In page removed the manual QR upload button from the UI (but the backend endpoint `POST /ticket/check-in/qr-image` still exists).
- Public/customer: `/`, `/movies`, `/movie/:id`, `/branches`, `/branch/:branchId`, `/profile`, `/my-bookings`, `/showtime/:showtimeId/seats`, `/booking/:bookingId/payment`, `/payment/vnpay-return`

Frontend/backend integration points:

- Backend endpoints include `/api` due context path, but controller annotations are written without `/api`.
- WebSocket URL from the frontend is `${API_BASE_URL}/ws`, so default is `http://localhost:8081/api/ws`.
- Seat selection subscribes to `/topic/showtime/{showtimeId}/seats`.
- Movie detail showtime rendering depends on `ShowtimeResponse.branchId`, `branchName`, `roomName`, and `roomType`.
- Movie management requires `directorId` for create and supports director fields in responses.

## Current Testing State

- No test files were found under `backend/src/test`.
- Existing backend verification is compile/package oriented:
  - `mvn -q -DskipTests compile`
  - `mvn -q -DskipTests package`
- No frontend test framework is configured in `frontend/package.json`.
- Existing frontend verification is build/lint oriented:
  - `npm run build`
  - `npm run lint`

## Implementation Notes And Pitfalls

- `BackendApplication.java` runs manual JDBC `ALTER TABLE` patches on startup (e.g., `bookings.status`, `users.role`, `users.branch_id`, `foods.branch_id`) to bypass JPA schema generation limitations.
- Promotion discounts are evaluated server-side.
- The `User` entity now stores `membershipTier` and `totalSpending`, which can automatically affect promotions.
- Context path matters: backend endpoints include `/api`, but controllers are written without `/api`.
- Keep Redis running for auth refresh/logout, OTPs, AI chat memory, and realtime seat hold display.
- Seat hold duration and VNPay payment expiry are both 6 minutes.
- `BookingCleanupJob` cancels expired DB bookings every 2 minutes and deletes Redis keys.
- `TicketStatus.HOLDING` can remain in DB if a pending booking is not cancelled through the service/job/payment paths.
- `BookingService.createBooking()` deletes all selected seat-hold keys when any `setIfAbsent` lock fails. It does not check lock ownership before deletion, so be careful when changing seat-lock behavior.
- Staff `CARD` bookings are left pending/holding; no card settlement endpoint was found.
- Runtime room creation does not create `COUPLE` seats, while seed room creation does.
- `OTPService.generateOTP()` currently uses `String.valueOf(Math.random() * 900000 + 100000)`, which can produce a decimal-looking string instead of a clean 6 digit integer.
- The visible brand is MoviePTIT, but QR values still use the `CINEMAHUB|...` prefix.
- The AI chat helper uses CinemaPTIT wording in prompts/tool text, while the rest of the app is MoviePTIT.
- The AI booking helper link should be verified against the frontend route before use.
- `BranchController.deleteBranch()` and seat type price writes currently require authentication but not an admin role.
- `SecurityConfig.PUBLIC_ENDPOINT` includes `/api/v1/cleanup/**`, but the effective matcher under the context path is `/v1/cleanup/**`; both are currently present around cleanup.
- MapStruct generated classes are build outputs; do not edit generated code.
- When changing DTOs, check both backend mappers and frontend API/page usage.
- When changing movie data, remember `CreateMovieRequest.directorId` is required.
- When adding admin-only behavior, enforce it in backend with `@PreAuthorize`; frontend route checks are UX only.
- Some source comments/text appear mojibake in terminal output due encoding. Avoid broad encoding rewrites unless specifically requested.
