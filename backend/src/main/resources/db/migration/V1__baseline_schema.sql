-- V1: schema đầy đủ cho database mới (MySQL 8, utf8mb4).
-- Flyway chạy file này trên database rỗng khi backend khởi động; tạo database trước:
--   CREATE DATABASE cinema CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Database đã có dữ liệu từ trước Flyway được baseline ở version 1 (bỏ qua file này) rồi đi tiếp V2.
-- Không sửa file đã phát hành: mọi thay đổi schema thêm bằng V{n}__mo_ta.sql mới.
--
-- Quy ước: tiền dùng DECIMAL, thời gian là giờ rạp (Asia/Ho_Chi_Minh) do ứng dụng ghi.
-- Ràng buộc và index được đặt tên để migration và entity (@Table indexes) dùng chung.
-- RedisToken nằm trong Redis nên không thuộc schema MySQL.

CREATE TABLE IF NOT EXISTS `branches` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `branch_code` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255),
  `city` VARCHAR(255),
  `phone` VARCHAR(255),
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_branches_branch_code` (`branch_code`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `directors` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `bio` VARCHAR(1000),
  PRIMARY KEY (`id`),
  KEY `idx_directors_name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `genres` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_genres_name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255),
  `email` VARCHAR(255),
  `phone_number` VARCHAR(255),
  `dob` DATE,
  `gender` ENUM('MALE', 'FEMALE', 'OTHER'),
  `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
  `status` ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
  `branch_id` BIGINT,
  `membership_tier` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM'),
  `total_spending` DECIMAL(15, 2),
  `created_at` DATETIME(6),
  `updated_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_phone_number` (`phone_number`),
  KEY `idx_users_branch_id` (`branch_id`),
  CONSTRAINT `fk_users_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `chk_users_role` CHECK (`role` IN ('ADMIN', 'MANAGER', 'STAFF', 'USER')),
  CONSTRAINT `chk_users_total_spending` CHECK (`total_spending` IS NULL OR `total_spending` >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `foods` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `branch_id` BIGINT,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(1000),
  `price` DECIMAL(12, 2) NOT NULL,
  `image_url` VARCHAR(255),
  `stock_quantity` INT,
  `low_stock_threshold` INT,
  `active` BIT(1) NOT NULL DEFAULT b'1',
  `created_at` DATETIME(6),
  `updated_at` DATETIME(6),
  PRIMARY KEY (`id`),
  KEY `idx_foods_branch_id` (`branch_id`),
  CONSTRAINT `fk_foods_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `chk_foods_price` CHECK (`price` >= 0),
  CONSTRAINT `chk_foods_stock` CHECK (
    (`stock_quantity` IS NULL OR `stock_quantity` >= 0)
    AND (`low_stock_threshold` IS NULL OR `low_stock_threshold` >= 0))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promotions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255),
  `discount_percent` INT NOT NULL,
  `max_discount` DECIMAL(15, 2),
  `min_order_amount` DECIMAL(15, 2),
  `min_membership_tier` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM'),
  `branch_id` BIGINT,
  `start_date` DATETIME(6),
  `end_date` DATETIME(6),
  `usage_limit` INT,
  `used_count` INT NOT NULL DEFAULT 0,
  `active` BIT(1) NOT NULL DEFAULT b'1',
  `created_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_promotions_code` (`code`),
  KEY `idx_promotions_branch_id` (`branch_id`),
  CONSTRAINT `fk_promotions_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `chk_promotions_discount` CHECK (`discount_percent` BETWEEN 0 AND 100),
  CONSTRAINT `chk_promotions_amounts` CHECK (
    (`max_discount` IS NULL OR `max_discount` >= 0)
    AND (`min_order_amount` IS NULL OR `min_order_amount` >= 0)),
  CONSTRAINT `chk_promotions_usage` CHECK (
    `used_count` >= 0 AND (`usage_limit` IS NULL OR `usage_limit` >= 0))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `movies` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `movie_name` VARCHAR(255) NOT NULL,
  `original_title` VARCHAR(255),
  `cast_names` TEXT,
  `banner_url` VARCHAR(500),
  `is_public` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `description` TEXT,
  `thumbnail_url` VARCHAR(500),
  `trailer_url` VARCHAR(500),
  `duration_minutes` INT,
  `age_rating` ENUM('P', 'K', 'T13', 'T16', 'T18'),
  `language` VARCHAR(255),
  `subtitle` VARCHAR(255),
  `release_date` DATE,
  `end_date` DATE,
  `status` ENUM('UPCOMING', 'NOW_SHOWING', 'ENDED'),
  `director_id` BIGINT,
  PRIMARY KEY (`id`),
  KEY `idx_movies_director_id` (`director_id`),
  CONSTRAINT `fk_movies_director`
    FOREIGN KEY (`director_id`) REFERENCES `directors` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `movie_genres` (
  `movie_id` BIGINT NOT NULL,
  `genre_id` BIGINT NOT NULL,
  PRIMARY KEY (`movie_id`, `genre_id`),
  KEY `idx_movie_genres_genre_id` (`genre_id`),
  CONSTRAINT `fk_movie_genres_movie`
    FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`),
  CONSTRAINT `fk_movie_genres_genre`
    FOREIGN KEY (`genre_id`) REFERENCES `genres` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rooms` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255),
  `room_technology` ENUM('STANDARD', 'IMAX', 'FOUR_DX', 'SCREEN_X', 'GOLD_CLASS') NOT NULL DEFAULT 'STANDARD',
  `seat_capacity` INT,
  `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
  `branch_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rooms_branch_code` (`branch_id`, `code`),
  CONSTRAINT `fk_rooms_branch`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `seats` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `room_id` BIGINT NOT NULL,
  `seat_code` VARCHAR(255) NOT NULL,
  `row_label` VARCHAR(255),
  `seat_number` INT,
  `seat_type` ENUM('STANDARD', 'VIP', 'COUPLE') NOT NULL DEFAULT 'STANDARD',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_seats_room_seat_code` (`room_id`, `seat_code`),
  UNIQUE KEY `uk_seats_room_row_number` (`room_id`, `row_label`, `seat_number`),
  CONSTRAINT `fk_seats_room`
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `showtimes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `room_id` BIGINT NOT NULL,
  `movie_id` BIGINT NOT NULL,
  `start_time` DATETIME(6) NOT NULL,
  `end_time` DATETIME(6) NOT NULL,
  `status` ENUM('OPEN', 'CLOSED', 'CANCELLED') NOT NULL,
  `screening_format` ENUM('TWO_D', 'THREE_D') NOT NULL DEFAULT 'TWO_D',
  `ticket_price` DECIMAL(38, 2) NOT NULL DEFAULT 75000,
  PRIMARY KEY (`id`),
  -- Lịch theo phòng (kiểm tra trùng giờ) và theo phim; cũng phục vụ khóa ngoại room_id/movie_id.
  KEY `idx_showtimes_room_start` (`room_id`, `start_time`),
  KEY `idx_showtimes_movie_start` (`movie_id`, `start_time`),
  CONSTRAINT `chk_showtimes_end_after_start` CHECK (`end_time` > `start_time`),
  CONSTRAINT `chk_showtimes_ticket_price` CHECK (`ticket_price` >= 0),
  CONSTRAINT `fk_showtimes_room`
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `fk_showtimes_movie`
    FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `booking_code` VARCHAR(255) NOT NULL,
  `user_id` BIGINT,
  `booked_staff` BIGINT,
  `showtime_id` BIGINT NOT NULL,
  `total_amount` DECIMAL(38, 2) NOT NULL DEFAULT 0,
  `promotion_code` VARCHAR(255),
  `discount_amount` DECIMAL(38, 2) NOT NULL DEFAULT 0,
  -- VARCHAR như Hibernate tạo: thêm trạng thái mới không cần ALTER cột (CHECK giữ giá trị hợp lệ).
  `status` VARCHAR(50) NOT NULL,
  `expires_at` DATETIME(6),
  `promotion_usage_reserved` BIT(1),
  `spending_recorded` BIT(1),
  `created_at` DATETIME(6),
  `updated_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bookings_booking_code` (`booking_code`),
  -- Đếm đơn chờ thanh toán của khách; cũng phục vụ khóa ngoại user_id.
  KEY `idx_bookings_user_status_expires` (`user_id`, `status`, `expires_at`),
  -- Job dọn đơn hết hạn: status = PENDING AND expires_at <= now.
  KEY `idx_bookings_status_expires` (`status`, `expires_at`),
  KEY `idx_bookings_booked_staff` (`booked_staff`),
  KEY `idx_bookings_showtime_id` (`showtime_id`),
  CONSTRAINT `chk_bookings_status` CHECK (`status` IN
    ('PENDING', 'CANCELLED', 'EXPIRED', 'COMPLETED', 'REFUND_REQUESTED', 'REFUNDED')),
  CONSTRAINT `chk_bookings_amounts` CHECK (`total_amount` >= 0 AND `discount_amount` >= 0),
  CONSTRAINT `fk_bookings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_bookings_booked_staff`
    FOREIGN KEY (`booked_staff`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_bookings_showtime`
    FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT NOT NULL,
  `amount` DECIMAL(38, 2) NOT NULL,
  `payment_method` ENUM('CARD', 'CASH', 'VNPAY'),
  `payment_status` VARCHAR(50) DEFAULT 'PENDING',
  `provider_txn_id` VARCHAR(255),
  `paid_at` DATETIME(6),
  `payment_created_at` DATETIME(6),
  `refund_reason` VARCHAR(255),
  `refund_process_note` VARCHAR(1000),
  `refund_processed_by` BIGINT,
  `refund_processed_at` DATETIME(6),
  `refunded_at` DATETIME(6),
  `refund_amount` DECIMAL(38, 2) DEFAULT 0,
  `refund_request_id` VARCHAR(32),
  `refund_gateway_status` VARCHAR(20),
  `refund_requested_at` DATETIME(6),
  `refund_gateway_code` VARCHAR(10),
  `refund_gateway_message` VARCHAR(500),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_booking_id` (`booking_id`),
  KEY `idx_payments_refund_processed_by` (`refund_processed_by`),
  CONSTRAINT `chk_payments_amounts` CHECK (
    `amount` >= 0 AND (`refund_amount` IS NULL OR `refund_amount` >= 0)),
  CONSTRAINT `fk_payments_booking`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_refund_processed_by`
    FOREIGN KEY (`refund_processed_by`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tickets` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT,
  `showtime_id` BIGINT NOT NULL,
  `seat_id` BIGINT NOT NULL,
  `price` DECIMAL(38, 2) NOT NULL,
  `ticket_status` ENUM('AVAILABLE', 'HOLDING', 'BOOKED') NOT NULL,
  `qr_code` VARCHAR(255),
  `checked_in_at` DATETIME(6),
  `checked_in_by` BIGINT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tickets_showtime_seat` (`showtime_id`, `seat_id`),
  -- Check-in tra theo mã QR; NULL (vé chưa bán) được phép lặp lại.
  UNIQUE KEY `uk_tickets_qr_code` (`qr_code`),
  KEY `idx_tickets_booking_id` (`booking_id`),
  KEY `idx_tickets_seat_id` (`seat_id`),
  KEY `idx_tickets_checked_in_by` (`checked_in_by`),
  CONSTRAINT `chk_tickets_price` CHECK (`price` >= 0),
  CONSTRAINT `fk_tickets_checked_in_by`
    FOREIGN KEY (`checked_in_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_tickets_booking`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  CONSTRAINT `fk_tickets_showtime`
    FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`),
  CONSTRAINT `fk_tickets_seat`
    FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `booking_foods` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT NOT NULL,
  `food_id` BIGINT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  `subtotal` DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_booking_foods_booking_id` (`booking_id`),
  KEY `idx_booking_foods_food_id` (`food_id`),
  CONSTRAINT `chk_booking_foods_values` CHECK (
    `quantity` > 0 AND `unit_price` >= 0 AND `subtotal` >= 0),
  CONSTRAINT `fk_booking_foods_booking`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  CONSTRAINT `fk_booking_foods_food`
    FOREIGN KEY (`food_id`) REFERENCES `foods` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `movie_ratings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `movie_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `score` INT NOT NULL,
  `comment` TEXT,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_movie_ratings_movie_user` (`movie_id`, `user_id`),
  KEY `idx_movie_ratings_user_id` (`user_id`),
  CONSTRAINT `chk_movie_ratings_score` CHECK (`score` BETWEEN 1 AND 5),
  CONSTRAINT `fk_movie_ratings_movie`
    FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`),
  CONSTRAINT `fk_movie_ratings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(120) NOT NULL,
  `setting_value` VARCHAR(1000) NOT NULL,
  `description` VARCHAR(500),
  `created_at` DATETIME(6),
  `updated_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_system_settings_key` (`setting_key`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `recipient_user_id` BIGINT,
  `recipient_role` ENUM('ADMIN', 'MANAGER', 'STAFF', 'USER'),
  `branch_id` BIGINT,
  `type` ENUM('BOOKING_STATUS', 'PROMOTION', 'REFUND_REQUEST', 'LOW_STOCK', 'SYSTEM') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` VARCHAR(1000) NOT NULL,
  `target_type` VARCHAR(255),
  `target_id` VARCHAR(255),
  `read_at` DATETIME(6),
  `created_at` DATETIME(6),
  PRIMARY KEY (`id`),
  -- API lấy 100 thông báo mới nhất.
  KEY `idx_notifications_created_at` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `actor_id` BIGINT,
  `actor_username` VARCHAR(255),
  `actor_role` ENUM('ADMIN', 'MANAGER', 'STAFF', 'USER'),
  `branch_id` BIGINT,
  `action` ENUM(
    'STAFF_BOOKING_CREATED', 'TICKET_CHECKED_IN', 'REFUND_APPROVED', 'REFUND_REJECTED',
    'FOOD_CREATED', 'FOOD_UPDATED', 'FOOD_DISABLED', 'SYSTEM_SETTING_UPDATED') NOT NULL,
  `target_type` VARCHAR(255),
  `target_id` VARCHAR(255),
  `details` VARCHAR(1000),
  `created_at` DATETIME(6),
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_created_at` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
