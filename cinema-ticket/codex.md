# Codex Project Context

Last refreshed: 2026-04-27

This file is the working context for the `cinema-huy` project. It is meant to help Codex or a developer quickly understand the repo before making changes.

## Project Summary

`cinema-huy` is a full-stack cinema booking app, branded in the UI as CinemaHub. It has:

- A Spring Boot backend under `backend/`.
- A Vite + React frontend under `frontend/`.
- MySQL persistence, Redis for token/session/seat-hold state, WebSocket/STOMP for realtime seat status, and VNPay sandbox integration for payment.

The app supports public movie/branch browsing, movie detail showtime filtering, seat selection, food combos, online booking/payment, user booking history, admin CRUD screens, staff counter booking, ticket QR/check-in, movie ratings, password reset OTP email, and seeded demo data.

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
- Spring Boot parent version: `4.0.3`.
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

- Vite + React 19.
- Default dev server: `http://localhost:5173`.
- API base URL: `VITE_API_BASE_URL`, fallback `http://localhost:8081/api`.
- Useful commands from `frontend/`:
  - `npm install`
  - `npm run dev`
  - `npm run build`
  - `npm run lint`

Important config note:

- `backend/src/main/resources/application.yaml` currently contains local DB credentials, mail credentials, JWT secret, and VNPay sandbox keys. Do not copy those values into docs, commits, tickets, or chat unless explicitly needed for local debugging. Prefer moving them to env vars later.

## Backend Stack

Core dependencies:

- Spring Boot Web MVC, Data JPA, JDBC, Validation.
- Spring Security OAuth2 Resource Server with custom JWT decoder.
- MySQL Connector/J.
- Redis via Spring Data Redis.
- WebSocket/STOMP.
- Java Mail.
- Lombok and MapStruct.
- ZXing for QR code generation.

Backend package pattern:

- `controller`: REST endpoints returning `ApiResponse<T>`.
- `service`: business logic, transactions, auth checks.
- `repository`: Spring Data repositories.
- `entity`: JPA entities plus Redis token entity.
- `dto/request` and `dto/response`: API payloads.
- `mapper`: MapStruct mappers, usually `componentModel = "spring"`.
- `exception`: `AppException`, `ErrorCode`, `GlobalExceptionHandler`.
- `config`: security, CORS, WebSocket, Redis/JWT/VNPay properties, app init.
- `job`: scheduled cleanup for expired bookings.

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

## Auth And Security

Auth endpoints:

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /sign-up`

JWT details:

- Tokens are signed with HS512.
- Access token lifetime: 30 minutes.
- Refresh token lifetime: 30 days.
- JWT claim `sub` is username.
- JWT claim `role` is one of `ADMIN`, `STAFF`, `USER`.
- Spring maps the `role` claim to authorities using prefix `ROLE_`.

Redis token behavior:

- Refresh token JWT IDs are saved in Redis and consumed on refresh.
- Logout saves the current access token JWT ID in Redis as a blacklist until expiry.
- `JwtDecoderConfig` calls `JwtService.verifyToken()` before decoding.

Frontend auth behavior:

- `frontend/src/context/AuthContext.jsx` decodes the access token from `localStorage`.
- `accessToken` and `refreshToken` are stored in `localStorage`.
- `frontend/src/api/axiosClient.js` attaches `Authorization: Bearer <token>`.
- A 401 response triggers `/auth/refresh`, stores the new pair, retries the original request, and redirects to `/login` if refresh fails.

Security rules:

- Public:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - VNPay return/IPN
  - password reset endpoints
  - WebSocket `/ws/**`
  - public GET routes for movie, showtime, ticket by showtime, genre, director, food, branch, room
  - `POST /user` is permitted, though frontend uses `POST /sign-up`
- Admin/staff restrictions are enforced by `@PreAuthorize` in controllers/services.
- Frontend `/admin` is admin-only.
- Frontend `/staff` is the separate staff workspace for counter booking, check-in, and booking lookup. It allows `STAFF` and `ADMIN`.
- Legacy staff URLs `/admin/staff-booking` and `/admin/check-in` redirect to `/staff/booking` and `/staff/check-in`.

## Domain Model

Main JPA entities:

- `User`: login identity and profile. Implements `UserDetails`. Has role/status and bookings.
- `Movie`: title, description, image/trailer, duration, age rating, language/subtitle, release/end dates, status, one director, genres, average rating summary.
- `Director`: one-to-many with movies. Each movie stores one `director_id`; a director can be attached to many movies.
- `Genre`: many-to-many with movies.
- `Branch`: cinema branch with code/name/address/city/phone/status.
- `Room`: belongs to branch. Unique `(branch_id, code)`. Has type, capacity, status.
- `Seat`: belongs to room. Unique `(room_id, seat_code)`. Has row/number/type/active.
- `SeatTypePrice`: price per `SeatType`.
- `Showtime`: room + movie + start/end/status.
- `Ticket`: unique `(showtime_id, seat_id)`, price, status, QR code, check-in timestamp.
- `Booking`: user + showtime + tickets + foods + amount/status/payment fields.
- `BookingFood`: food line item on booking.
- `Food`: concession item, price/image/active.
- `MovieRating`: unique `(movie_id, user_id)`, integer score.
- `RedisToken`: Redis hash for refresh token IDs and blacklisted access token IDs.

Important enums:

- User roles: `ADMIN`, `STAFF`, `USER`
- User status: `ACTIVE`, `INACTIVE`, `BLOCKED`
- Movie status: `UPCOMING`, `NOW_SHOWING`, `ENDED`
- Age rating: `P`, `K`, `T13`, `T16`, `T18`
- Room type: `TWO_D`, `THREE_D`, `IMAX`, `FOUR_DX`
- Seat type: `STANDARD`, `VIP`, `COUPLE`
- Showtime status: `OPEN`, `CLOSED`
- Ticket status: `AVAILABLE`, `HOLDING`, `BOOKED`
- Booking status: `PENDING`, `CANCELLED`, `EXPIRED`, `COMPLETED`
- Payment method: `CASH`, `CARD`, `VNPAY`
- Payment status: `PENDING`, `PAID`, `CANCELLED`

## Main Backend Flows

Initial seed:

- `ApplicationInitConfig` runs `DataSeedService.seedInitialData()` at startup.
- It upserts demo users, seat prices, foods, genres, directors, movies, branches, rooms, seats, showtimes, and tickets.
- Demo users from code:
  - `admin / admin@123`
  - `staff / staff@123`
  - `user / user@123`
  - `user2 / user2@123`

Room and ticket generation:

- `RoomService.createRoom()` saves a room and generates a grid of seats based on capacity.
- `RoomService.updateRoom()` regenerates seats only when capacity changes and there are no showtimes.
- `ShowtimeService.createShowtime()` rejects overlapping room schedules and creates tickets for all room seats.
- Ticket price comes from `SeatTypePrice`.

Booking:

- User booking endpoint creates a `PENDING` booking.
- Selected seats must map to available tickets for the showtime.
- Duplicate seat IDs are rejected.
- Food quantities are validated and included in `totalAmount`.
- Each selected seat gets a Redis lock: `seat_hold:{showtimeId}:{seatId}` with 6 minute TTL.
- Tickets are moved to `HOLDING`.
- WebSocket broadcasts `HOLDING` events to `/topic/showtime/{showtimeId}/seats`.
- Booking code format: `BK-YYYYMMDD-XXXXXX`.

Realtime seat status:

- `TicketService.getTicketsByShowtimeId()` reads DB tickets and Redis seat-hold keys.
- `displayStatus` is derived so held seats show as `HOLDING` even when the DB status has not been finalized.
- `SeatSelectPage` subscribes to the showtime topic and updates seats as messages arrive.

Payment:

- `VnpayService.createPaymentUrl()` builds a VNPay sandbox payment URL.
- VNPay return/IPN verify checksum, response code, and transaction status.
- On success:
  - booking -> `COMPLETED`
  - payment -> `PAID`
  - payment method -> `VNPAY`
  - tickets -> `BOOKED`
  - QR values are generated
  - Redis seat holds are deleted
  - WebSocket broadcasts `BOOKED`
  - `BookingPaidEvent` is published for ticket email
- On failure/cancel:
  - booking -> `CANCELLED`
  - payment -> `CANCELLED`
  - tickets detach from booking and go back to `AVAILABLE`
  - Redis seat holds are deleted
  - WebSocket broadcasts `AVAILABLE`

Cleanup:

- `BookingCleanupJob.releaseExpiredBookings()` runs every 2 minutes.
- It finds expired `PENDING` bookings, cancels them, releases tickets to `AVAILABLE`, and broadcasts updates.
- It does not explicitly delete Redis keys in this job; Redis TTL handles the lock expiry.

Staff booking:

- `POST /booking/staff` requires `ADMIN` or `STAFF`.
- Staff uses `GET /showtime/today` to load all showtimes for the current day.
- The counter-booking UI mirrors the customer booking flow: filter by CinemaHub branch, select today's showtime, select seats with realtime WebSocket updates, add food, enter customer/payment info, then complete the booking at the counter.
- `POST /booking/staff` creates or reuses a customer by email/phone, supports cash/card style counter sales, marks booking complete/paid immediately, books tickets, emits WebSocket updates, and sends ticket email.

Check-in:

- `POST /ticket/check-in` requires `ADMIN` or `STAFF`.
- Accepts a ticket ID, QR value containing `TICKET=...`, raw QR code, or booking code.
- Only completed, paid bookings with booked tickets can check in.
- Existing check-ins are reported as already checked in.

Movie rating:

- Authenticated users can rate a movie.
- Ratings are unique per `(movie, user)`.
- Movie responses include average rating, rating count, genres, and director fields (`directorId`, `directorName`).

Movie/director management:

- `CreateMovieRequest` requires `directorId`; `UpdateMovieRequest` can change `directorId`.
- `MovieMapper` maps `Movie.director.id/name` into `MovieResponse.directorId/directorName`.
- `DirectorService` exposes director CRUD; create/update/delete require `ADMIN`, while GET director endpoints are public.
- `ShowtimeRepository` uses entity graphs with `room.branch` for showtime reads so movie detail can display branch, city, room, and room type without falling back to "Rạp khác".

Password reset:

- Forgot password generates an OTP in Redis with 5 minute TTL.
- OTP is sent by email.
- Reset verifies OTP then updates the bcrypt password.

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
- `GET /users`
- `GET /users/{id}`
- `PUT /users/{id}`
- `DELETE /users/{id}`
- `PUT /users/{id}/status`
- `GET /my-info`
- `PUT /my-info`

Movies/genres/directors:

- `GET /movie`
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
- `GET /room`
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

Cleanup/dev:

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

## Frontend Stack

Dependencies:

- React 19, React DOM 19.
- React Router DOM 7.
- Axios.
- Framer Motion for page transitions.
- React Toastify.
- STOMP + SockJS for realtime seat updates.
- Recharts for dashboard charts.
- QR code and ticket image helpers: `qrcode.react`, `html-to-image`.
- Canvas confetti for payment result.

Frontend entry:

- `frontend/src/main.jsx` renders `App`.
- `App` wraps `AuthProvider`, `BrowserRouter`, `AnimatedRoutes`, Toastify, and ErrorBoundary.
- Styling is centralized mostly in `frontend/src/index.css` plus component/page CSS files.

API files:

- `frontend/src/api/axiosClient.js`: Axios instance, base URL, auth header, refresh-on-401.
- `frontend/src/api/index.js`: grouped API helper objects.

## Frontend Routes

Auth:

- `/login`
- `/register`

Admin:

- `/admin`
- `/admin/movies`
- `/admin/showtimes`
- `/admin/branches`
- `/admin/users`
- `/admin/bookings`

Staff:

- `/staff`
- `/staff/booking`
- `/staff/check-in`
- `/staff/bookings`

Public/customer pages:

- `/`
- `/movies`
- `/movie/:id`
- `/branches`
- `/branch/:branchId`
- `/profile`
- `/my-bookings`
- `/showtime/:showtimeId/seats`
- `/booking/:bookingId/payment`
- `/payment/vnpay-return`
- `*` not found

Key pages:

- `HomePage`: landing/home content.
- `MovieListPage`, `MovieDetailPage`: movie browsing, rating, and showtime selection. Movie detail shows genre and director as pill-style facts, then groups showtimes by selected date, city, branch, room/format, and time.
- `BranchListPage`, `BranchDetailPage`: branch browsing and showtimes by date.
- `SeatSelectPage`: seat/food selection, STOMP subscription, booking creation.
- `PaymentPage`, `PaymentResultPage`: VNPay checkout flow.
- `MyBookingsPage`: user booking list and cancel pending bookings.
- `ProfilePage`: personal info.
- Admin pages manage movies, showtimes, branches, users, and bookings. Movie management loads directors, shows a director column, requires a director selection, and supports quick-create director from the movie modal.
- Staff pages handle counter booking, ticket check-in, and booking lookup.

## Seed/Data Notes

At startup `DataSeedService` seeds demo data automatically. It seeds directors and assigns every demo movie one director. There is also `backend/seed-data.ps1`, which:

- Waits for backend readiness at `/movie/now-showing`.
- Calls `DELETE /v1/cleanup/database`.
- Logs in as admin.
- Creates genres, directors, branches, rooms, movies with `directorId`, showtimes, a test user, and demo bookings.

Because the backend already seeds on startup, use the script only when a full reset/demo dataset is desired.

## Current Testing State

- No test files were found under `backend/src/test`.
- No frontend test framework is configured in `frontend/package.json`.
- Existing verification commands are compile/build/lint oriented:
  - backend compile/package with Maven.
  - frontend build/lint with npm.
- Latest verified after movie detail/director updates:
  - `mvn -q -DskipTests compile`
  - `npm run build` (passes with the existing Vite large chunk warning)

## Implementation Notes And Pitfalls

- Context path matters: backend endpoints include `/api`, but controllers are written without `/api`.
- WebSocket URL from the frontend is `${API_BASE_URL}/ws`, so with default config it becomes `http://localhost:8081/api/ws`.
- Keep Redis running for auth refresh/logout, OTPs, and realtime seat hold display.
- Seat hold duration and VNPay payment expiry are both 6 minutes.
- `BookingCleanupJob` cancels expired DB bookings every 2 minutes; Redis keys expire independently.
- `TicketStatus.HOLDING` can remain in DB if a pending booking is cancelled incorrectly; use service flows that reset tickets and broadcast.
- MapStruct generated classes are build outputs; do not edit generated code.
- When changing DTOs, check both backend mappers and frontend API/page usage.
- When changing movie data, remember `CreateMovieRequest.directorId` is required and the admin movie modal must supply it.
- Movie detail showtime rendering depends on `ShowtimeResponse.branchId`, `branchName`, `roomName`, and `roomType`; keep `ShowtimeRepository` fetching `room.branch` for movie showtime queries.
- When adding admin-only behavior, enforce it in backend with `@PreAuthorize`; frontend route checks are UX only.
- `User.getAuthorities()` returns an empty list, but JWT resource server authority mapping uses the JWT `role` claim for API requests.
- Some source comments/text appear mojibake in terminal output due encoding, but source intent is Vietnamese. Avoid broad encoding rewrites unless specifically requested.
- `application.yaml` contains secrets and local credentials. Treat them as sensitive even though they are already in the repo.
