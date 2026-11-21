# Từ điển dữ liệu

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45` (schema sau Flyway V7).

Nguồn: [V1__baseline_schema.sql](../../backend/src/main/resources/db/migration/V1__baseline_schema.sql) cùng các thay đổi của V3 đến V7. Quan hệ giữa các bảng nằm trong [erd.md](erd.md).

## Quy ước chung

- Khóa chính luôn là `id BIGINT AUTO_INCREMENT`. JSON có thể đặt tên khác (`bookingId`, `showtimeId`...) theo DTO.
- Mọi cột tiền là `DECIMAL(15,2)`, đơn vị đồng (V3).
- Thời gian là `DATETIME(6)` theo giờ rạp `Asia/Ho_Chi_Minh`, không lưu múi giờ.
- Enum: cột `ENUM` của MySQL được giữ nguyên. Enum lưu dạng `VARCHAR` luôn có ràng buộc `CHECK` liệt kê giá trị hợp lệ. Thêm giá trị enum trong Java bắt buộc có migration cập nhật `ENUM` hoặc `CHECK`.
- Tên ràng buộc: `uk_*` (unique), `idx_*` (index), `chk_*` (check), `fk_*` (khóa ngoại), trùng với `@Table` của entity.
- Cột "Null" ghi **Không** khi có `NOT NULL`.

## Rạp và phim

### `branches` — chi nhánh

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `branch_code` | VARCHAR(255) | Không | `uk_branches_branch_code` | Mã chi nhánh, ví dụ `CN-HCM-01` |
| `name` | VARCHAR(255) | Không | | Tên hiển thị |
| `address`, `city`, `phone` | VARCHAR(255) | Có | | Thông tin liên hệ |
| `status` | ENUM | Không | Mặc định `ACTIVE` | `ACTIVE`, `INACTIVE`. Chi nhánh `INACTIVE` không bán vé. |
| `created_at`, `updated_at` | DATETIME(6) | Không | Mặc định thời điểm hiện tại | |

### `rooms` — phòng chiếu

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `branch_id` | BIGINT | Không | FK `branches` | |
| `code` | VARCHAR(50) | Không | `uk_rooms_branch_code (branch_id, code)` | Mã phòng, duy nhất trong chi nhánh |
| `name` | VARCHAR(255) | Có | | |
| `room_technology` | ENUM | Không | Mặc định `STANDARD` | `STANDARD`, `IMAX`, `FOUR_DX`, `SCREEN_X`, `GOLD_CLASS` |
| `seat_capacity` | INT | Có | `chk_rooms_seat_capacity` ≥ 0 | Số ghế thật, `SeatService` tự cập nhật |
| `status` | ENUM | Không | Mặc định `ACTIVE` | `ACTIVE`, `INACTIVE`, `MAINTENANCE`. Chỉ phòng `ACTIVE` được xếp suất và bán vé. |

### `seats` — ghế

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `room_id` | BIGINT | Không | FK `rooms` | |
| `seat_code` | VARCHAR(255) | Không | `uk_seats_room_seat_code (room_id, seat_code)` | Mã ghế, ví dụ `A5` |
| `row_label` | VARCHAR(255) | Có | `uk_seats_room_row_number (room_id, row_label, seat_number)` | Hàng |
| `seat_number` | INT | Có | (như trên) | Số ghế trong hàng |
| `seat_type` | ENUM | Không | Mặc định `STANDARD` | `STANDARD`, `VIP`, `COUPLE` |

Không đổi được cấu trúc phòng khi phòng đã có suất chiếu (`ROOM_HAS_SHOWTIMES`).

### `movies` — phim

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `movie_name` | VARCHAR(255) | Không | | Tên tiếng Việt |
| `original_title` | VARCHAR(255) | Có | | Tên gốc |
| `cast_names` | TEXT | Có | | Diễn viên |
| `description` | TEXT | Có | | |
| `thumbnail_url`, `banner_url`, `trailer_url` | VARCHAR(500) | Có | | Poster, banner, trailer |
| `duration_minutes` | INT | Có | | Thời lượng |
| `age_rating` | ENUM | Có | | `P`, `K`, `T13`, `T16`, `T18` |
| `language`, `subtitle` | VARCHAR(255) | Có | | |
| `release_date`, `end_date` | DATE | Có | `end_date` không trước `release_date` (kiểm tra ở service) | Ngày khởi chiếu và ngày ngừng chiếu |
| `status` | ENUM | Có | | `UPCOMING`, `NOW_SHOWING`, `ENDED`. Job tự chuyển theo ngày, chỉ đi tới. |
| `is_public` | BOOLEAN | Không | Mặc định TRUE | FALSE là bản nháp, chỉ ADMIN thấy |
| `director_id` | BIGINT | Có | FK `directors` | |
| `created_at`, `updated_at` | DATETIME(6) | Không | | |

### `directors`, `genres`, `movie_genres`

| Bảng | Cột | Ghi chú |
| --- | --- | --- |
| `directors` | `id`, `name` VARCHAR(255) NOT NULL, `bio` VARCHAR(1000) | Cho phép trùng tên. Index `idx_directors_name`. |
| `genres` | `id`, `name` VARCHAR(255) NOT NULL | `uk_genres_name`. Tạo thể loại trùng tên trả `DUPLICATE_VALUE`. |
| `movie_genres` | `movie_id`, `genre_id` | Bảng nối nhiều-nhiều, PK `(movie_id, genre_id)`. |

### `movie_ratings` — đánh giá

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `movie_id`, `user_id` | BIGINT | Không | FK, `uk_movie_ratings_movie_user` | Mỗi người tối đa một đánh giá cho mỗi phim. Đánh giá lại là cập nhật. |
| `score` | INT | Không | `chk_movie_ratings_score` 1–5 | |
| `comment` | TEXT | Có | | |
| `created_at`, `updated_at` | DATETIME(6) | Không | | |

### `showtimes` — suất chiếu

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `room_id`, `movie_id` | BIGINT | Không | FK. Index `idx_showtimes_room_start`, `idx_showtimes_movie_start` | |
| `start_time`, `end_time` | DATETIME(6) | Không | `chk_showtimes_end_after_start` | Cách suất khác cùng phòng ≥ 15 phút (kiểm tra ở service) |
| `status` | ENUM | Không | | `OPEN` (đang bán), `CLOSED` (đã qua giờ, job tự chuyển), `CANCELLED` |
| `screening_format` | ENUM | Không | Mặc định `TWO_D` | `TWO_D`, `THREE_D` |
| `ticket_price` | DECIMAL(15,2) | Không | Mặc định 75000, `chk_showtimes_ticket_price` ≥ 0 | Giá chung cho mọi ghế của suất |

## Đặt vé và thanh toán

### `tickets` — vé

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `showtime_id`, `seat_id` | BIGINT | Không | FK, `uk_tickets_showtime_seat` | Một vé cho mỗi ghế của mỗi suất |
| `booking_id` | BIGINT | Có | FK `bookings` | Null khi ghế trống |
| `price` | DECIMAL(15,2) | Không | ≥ 0 | Giá chụp từ suất |
| `ticket_status` | ENUM | Không | | `AVAILABLE`, `HOLDING`, `BOOKED` |
| `qr_code` | VARCHAR(255) | Có | `uk_tickets_qr_code` | `CINEMAHUB\|BOOKING=...\|TICKET=...\|SEAT=...`, cấp khi vé `BOOKED` |
| `checked_in_at` | DATETIME(6) | Có | | Lần soát đầu tiên |
| `checked_in_by` | BIGINT | Có | FK `users` | Người soát |

### `bookings` — đơn

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | JSON là `bookingId`, cũng là `vnp_TxnRef` |
| `booking_code` | VARCHAR(255) | Không | `uk_bookings_booking_code` | `BK-YYYYMMDD-XXXXXXXX` |
| `user_id` | BIGINT | Có | FK `users` | Khách sở hữu đơn |
| `booked_staff` | BIGINT | Có | FK `users` | Nhân viên bán, null với đơn online |
| `showtime_id` | BIGINT | Không | FK `showtimes` | |
| `total_amount` | DECIMAL(15,2) | Không | Mặc định 0, ≥ 0 | Số tiền phải trả sau giảm giá |
| `promotion_code` | VARCHAR(255) | Có | | Mã đã áp, không có FK |
| `discount_amount` | DECIMAL(15,2) | Không | Mặc định 0, ≥ 0 | Số tiền được giảm |
| `status` | VARCHAR(50) | Không | `chk_bookings_status` | `PENDING`, `CANCELLED`, `EXPIRED`, `COMPLETED`, `REFUND_REQUESTED`, `REFUNDED`. `EXPIRED` chỉ còn ở dữ liệu cũ. |
| `expires_at` | DATETIME(6) | Có | Index `idx_bookings_status_expires`, `idx_bookings_user_status_expires` | Hạn giữ ghế |
| `promotion_usage_reserved` | BIT(1) | Có | | TRUE: đang giữ một lượt khuyến mãi. NULL: đơn cũ, tính lượt khi thanh toán. |
| `spending_recorded` | BIT(1) | Có | | TRUE: đã cộng vào chi tiêu. FALSE: thanh toán trễ, hoặc đã trừ khi hoàn. NULL: chưa xử lý. |
| `created_at`, `updated_at` | DATETIME(6) | Có | | |

### `payments` — thanh toán

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `booking_id` | BIGINT | Không | FK `bookings` `ON DELETE CASCADE`, `uk_payments_booking_id` | Một-một với đơn |
| `amount` | DECIMAL(15,2) | Không | ≥ 0 | Số tiền thanh toán, bằng `bookings.total_amount` |
| `payment_method` | ENUM | Có | | `CARD`, `CASH`, `VNPAY` |
| `payment_status` | VARCHAR(50) | Có | Mặc định `PENDING`, `chk_payments_status` | `PENDING`, `PAID`, `CANCELLED`, `REFUNDED` |
| `provider_txn_id` | VARCHAR(255) | Có | | `vnp_TransactionNo` của giao dịch thanh toán |
| `paid_at` | DATETIME(6) | Có | | Thời điểm thanh toán, mốc tính hạn hoàn |
| `payment_created_at` | DATETIME(6) | Có | | `vnp_CreateDate`, dùng lại khi truy vấn và hoàn |
| `refund_reason` | VARCHAR(255) | Có | | Lý do hoàn |
| `refund_process_note` | VARCHAR(1000) | Có | | Ghi chú của người xử lý |
| `refund_processed_by` | BIGINT | Có | FK `users` | Người xử lý gần nhất |
| `refund_processed_at` | DATETIME(6) | Có | | Lần xử lý gần nhất, không phải ngày hoàn |
| `refunded_at` | DATETIME(6) | Có | | Ngày hoàn tất |
| `refund_amount` | DECIMAL(15,2) | Có | Mặc định 0, ≥ 0 | |
| `refund_request_id` | VARCHAR(32) | Có | | Mã lần thử hoàn qua VNPay (`vnp_RequestId`) |
| `refund_gateway_status` | VARCHAR(20) | Có | `chk_payments_refund_gateway_status` | `PROCESSING`, `UNKNOWN`, `FAILED`, `SUCCEEDED` |
| `refund_requested_at` | DATETIME(6) | Có | | Thời điểm gửi lần thử |
| `refund_gateway_code` | VARCHAR(10) | Có | | Mã phản hồi của cổng |
| `refund_gateway_message` | VARCHAR(500) | Có | | Thông điệp hiển thị cho quản lý |
| `created_at`, `updated_at` | DATETIME(6) | Không | | |

### `booking_foods` — bắp nước trong đơn

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `booking_id`, `food_id` | BIGINT | Không | FK | |
| `quantity` | INT | Không | > 0 | Tối đa 50 (kiểm tra ở API) |
| `unit_price`, `subtotal` | DECIMAL(15,2) | Không | ≥ 0 | Chụp lúc đặt |

### `payment_events` — nhật ký thanh toán (V5)

Chỉ thêm, không sửa, không lưu chữ ký `vnp_SecureHash`.

| Cột | Kiểu | Null | Ý nghĩa |
| --- | --- | --- | --- |
| `id` | BIGINT | Không | PK |
| `booking_id` | BIGINT | Có | FK `bookings`, không cascade. Null khi callback không khớp đơn nào. |
| `event_type` | VARCHAR(30) | Không | `VNPAY_RETURN`, `VNPAY_IPN`, `REFUND_SUBMIT`, `REFUND_QUERY` (`chk_payment_events_type`) |
| `reference` | VARCHAR(100) | Có | `vnp_TxnRef` với callback, `refund_request_id` với hoàn tiền |
| `provider_txn_id` | VARCHAR(100) | Có | `vnp_TransactionNo` |
| `amount` | DECIMAL(15,2) | Có | |
| `response_code`, `transaction_status` | VARCHAR(20) | Có | Mã phản hồi và trạng thái giao dịch |
| `valid_signature` | BIT(1) | Có | Chữ ký callback hợp lệ |
| `outcome` | VARCHAR(50) | Có | Kết quả xử lý (`RspCode` với callback, trạng thái cổng với hoàn tiền) |
| `message` | VARCHAR(500) | Có | |
| `created_at` | DATETIME(6) | Không | |

## Khách hàng, bắp nước, khuyến mãi

### `users` — tài khoản

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `username` | VARCHAR(255) | Không | `uk_users_username` | Khách vãng lai có tiền tố `guest_` |
| `password` | VARCHAR(255) | Không | | BCrypt |
| `full_name` | VARCHAR(255) | Có | | |
| `email` | VARCHAR(255) | Có | `uk_users_email` | |
| `phone_number` | VARCHAR(255) | Có | `uk_users_phone_number` | |
| `dob` | DATE | Có | | |
| `gender` | ENUM | Có | | `MALE`, `FEMALE`, `OTHER` |
| `role` | VARCHAR(20) | Không | Mặc định `USER`, `chk_users_role` | `ADMIN`, `MANAGER`, `STAFF`, `USER` |
| `status` | ENUM | Không | Mặc định `ACTIVE` | `ACTIVE`, `INACTIVE`, `BLOCKED` |
| `branch_id` | BIGINT | Có | FK `branches` (RESTRICT) | Bắt buộc với STAFF và MANAGER |
| `membership_tier` | ENUM | Có | | `BRONZE`, `SILVER`, `GOLD`, `PLATINUM` |
| `total_spending` | DECIMAL(15,2) | Có | ≥ 0 | Tổng chi tiêu |
| `created_at`, `updated_at` | DATETIME(6) | Có | | |

### `foods` — bắp nước

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `branch_id` | BIGINT | Có | FK `branches` (RESTRICT) | Null: bán ở mọi chi nhánh |
| `name` | VARCHAR(255) | Không | | |
| `description` | VARCHAR(1000) | Có | | |
| `price` | DECIMAL(15,2) | Không | ≥ 0 | |
| `image_url` | VARCHAR(255) | Có | | |
| `stock_quantity` | INT | Có | ≥ 0 | Null: không giới hạn |
| `low_stock_threshold` | INT | Có | ≥ 0 | Null: dùng mặc định 10 |
| `active` | BIT(1) | Không | Mặc định 1 | Ngừng bán khi 0 |
| `created_at`, `updated_at` | DATETIME(6) | Có | | |

### `promotions` — khuyến mãi

| Cột | Kiểu | Null | Ràng buộc | Ý nghĩa |
| --- | --- | --- | --- | --- |
| `id` | BIGINT | Không | PK | |
| `code` | VARCHAR(50) | Không | `uk_promotions_code` | Lưu chữ hoa |
| `description` | VARCHAR(255) | Có | | |
| `discount_percent` | INT | Không | 0–100 | |
| `max_discount` | DECIMAL(15,2) | Có | ≥ 0 | |
| `min_order_amount` | DECIMAL(15,2) | Có | ≥ 0 | |
| `min_membership_tier` | ENUM | Có | | Hạng tối thiểu |
| `branch_id` | BIGINT | Có | FK `branches` (RESTRICT) | Null: toàn hệ thống |
| `start_date`, `end_date` | DATETIME(6) | Có | | |
| `usage_limit` | INT | Có | ≥ 0 | Null: không giới hạn |
| `used_count` | INT | Không | Mặc định 0, ≥ 0 | Lượt đang giữ cộng lượt đã dùng |
| `active` | BIT(1) | Không | Mặc định 1 | |
| `created_at` | DATETIME(6) | Có | | |

## Vận hành

### `notifications` và `notification_reads`

| Bảng | Cột | Ý nghĩa |
| --- | --- | --- |
| `notifications` | `recipient_user_id` BIGINT, `recipient_role` ENUM, `branch_id` BIGINT | Người nhận: một người cụ thể, hoặc một role (ở một chi nhánh, hoặc toàn hệ thống khi `branch_id` null). Không có FK. |
| | `type` ENUM NOT NULL | `BOOKING_STATUS`, `PROMOTION`, `REFUND_REQUEST`, `LOW_STOCK`, `SYSTEM` |
| | `title` VARCHAR(255), `message` VARCHAR(1000) NOT NULL | Nội dung |
| | `target_type`, `target_id` VARCHAR(255) | Đối tượng liên quan, ví dụ `Booking` và ID đơn |
| | `created_at` | Index `idx_notifications_created_at`. Cột `read_at` cũ đã bị bỏ ở V4. |
| `notification_reads` | `notification_id`, `user_id` BIGINT NOT NULL, `read_at` NOT NULL | Duy nhất theo `(notification_id, user_id)`. FK `ON DELETE CASCADE` tới cả hai bảng. |

### `audit_logs` — nhật ký thao tác

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `actor_id`, `actor_username`, `actor_role` | BIGINT, VARCHAR, ENUM | Người thao tác, lưu bản chụp, không FK |
| `branch_id` | BIGINT | Chi nhánh của người thao tác |
| `action` | ENUM NOT NULL | `STAFF_BOOKING_CREATED`, `TICKET_CHECKED_IN`, `REFUND_APPROVED`, `REFUND_REJECTED`, `FOOD_CREATED`, `FOOD_UPDATED`, `FOOD_DISABLED`, `SYSTEM_SETTING_UPDATED`, `REFUND_REQUESTED` (V7) |
| `target_type`, `target_id` | VARCHAR(255) | Đối tượng bị tác động |
| `details` | VARCHAR(1000) | Mô tả |
| `created_at` | DATETIME(6) | Index `idx_audit_logs_created_at` |

### `system_settings` — cấu hình

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `setting_key` | VARCHAR(120) NOT NULL, `uk_system_settings_key` | Khóa cấu hình |
| `setting_value` | VARCHAR(1000) NOT NULL | Giá trị dạng chuỗi |
| `description` | VARCHAR(500) | |
| `created_at`, `updated_at` | DATETIME(6) | |

Giá trị mặc định được tạo khi backend khởi động nếu chưa có. Danh sách khóa ở [tham số nghiệp vụ](../02-domain/overview.md#tham-số-nghiệp-vụ).

## Dữ liệu ngoài MySQL

Redis giữ token, OTP và khóa giữ ghế. Danh sách key ở [vai trò của Redis](../03-architecture/overview.md#vai-trò-của-redis). Ảnh poster và banner upload nằm trong thư mục `app.movie-media-directory` (mặc định `uploads/movies`), database chỉ lưu đường dẫn.
