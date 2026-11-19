-- Schema generated from the JPA entities in src/main/java/com/ltweb/backend/entity.
-- RedisToken is stored in Redis and is intentionally not part of this MySQL schema.

CREATE DATABASE IF NOT EXISTS `cinema`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cinema`;

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
  `name` VARCHAR(255),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255),
  `password` VARCHAR(255),
  `full_name` VARCHAR(255),
  `email` VARCHAR(255),
  `phone_number` VARCHAR(255),
  `dob` DATE,
  `gender` ENUM('MALE', 'FEMALE', 'OTHER'),
  `role` VARCHAR(20),
  `status` ENUM('ACTIVE', 'INACTIVE', 'BLOCKED'),
  `membership_tier` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM'),
  `total_spending` DECIMAL(15, 2),
  `created_at` DATETIME(6),
  `updated_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_phone_number` (`phone_number`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `foods` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(1000),
  `price` DECIMAL(12, 2) NOT NULL,
  `image_url` VARCHAR(255),
  `active` BIT(1),
  `created_at` DATETIME(6),
  `updated_at` DATETIME(6),
  PRIMARY KEY (`id`)
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
  `used_count` INT,
  `active` BIT(1),
  `created_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_promotions_code` (`code`)
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
  `ticket_price` DECIMAL(38, 2) NOT NULL DEFAULT 75000,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `room_id` BIGINT NOT NULL,
  `movie_id` BIGINT NOT NULL,
  `start_time` DATETIME(6) NOT NULL,
  `end_time` DATETIME(6) NOT NULL,
  `status` ENUM('OPEN', 'CLOSED', 'CANCELLED') NOT NULL,
  `screening_format` ENUM('TWO_D', 'THREE_D') NOT NULL DEFAULT 'TWO_D',
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_showtimes_end_after_start` CHECK (`end_time` > `start_time`),
  KEY `idx_showtimes_room_id` (`room_id`),
  KEY `idx_showtimes_movie_id` (`movie_id`),
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
  `total_amount` DECIMAL(38, 2),
  `promotion_code` VARCHAR(255),
  `discount_amount` DECIMAL(38, 2),
  `status` ENUM('PENDING', 'CANCELLED', 'EXPIRED', 'COMPLETED'),
  `expires_at` DATETIME(6),
  `created_at` DATETIME(6),
  `updated_at` DATETIME(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bookings_booking_code` (`booking_code`),
  KEY `idx_bookings_user_id` (`user_id`),
  KEY `idx_bookings_booked_staff` (`booked_staff`),
  KEY `idx_bookings_showtime_id` (`showtime_id`),
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
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_booking_id` (`booking_id`),
  KEY `idx_payments_refund_processed_by` (`refund_processed_by`),
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
  KEY `idx_tickets_booking_id` (`booking_id`),
  KEY `idx_tickets_seat_id` (`seat_id`),
  KEY `idx_tickets_checked_in_by` (`checked_in_by`),
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
  CONSTRAINT `fk_movie_ratings_movie`
    FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`),
  CONSTRAINT `fk_movie_ratings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
