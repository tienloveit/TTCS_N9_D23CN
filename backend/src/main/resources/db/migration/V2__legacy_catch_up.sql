-- V2: đưa database có từ trước Flyway về đúng schema V1.
-- Gộp các script chạy tay 20261112_refund_gateway_attempt, 20261120_booking_usage_markers,
-- 20261121_schema_integrity và phần chuẩn hóa users.role. Mọi bước đều kiểm tra trước khi đổi,
-- nên trên database tạo từ V1 file này không thay đổi gì.
-- Database cũ hơn (còn PK branch_id/movie_id/booking_id, chưa tách payments...) phải chạy các
-- script 20261111_* trong backend/migrations trước khi khởi động backend có Flyway.
-- Nếu dữ liệu vi phạm ràng buộc, migration dừng với thông báo cụ thể; sửa dữ liệu rồi khởi động lại
-- (Flyway ghi bản chạy lỗi; dùng `flyway repair` hoặc xóa dòng lỗi trong flyway_schema_history).

-- ----- 20261112_refund_gateway_attempt -----
-- MySQL 8. Apply to the intended database before deploying with ddl-auto=validate.
-- Additive only. Existing refund records are NOT asserted to be gateway-confirmed.
DELIMITER $$
DROP PROCEDURE IF EXISTS app_refund_gateway_attempt$$
CREATE PROCEDURE app_refund_gateway_attempt()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_request_id') THEN
        ALTER TABLE payments ADD COLUMN refund_request_id VARCHAR(32) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_gateway_status') THEN
        ALTER TABLE payments ADD COLUMN refund_gateway_status VARCHAR(20) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_requested_at') THEN
        ALTER TABLE payments ADD COLUMN refund_requested_at DATETIME(6) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_gateway_code') THEN
        ALTER TABLE payments ADD COLUMN refund_gateway_code VARCHAR(10) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_gateway_message') THEN
        ALTER TABLE payments ADD COLUMN refund_gateway_message VARCHAR(500) NULL;
    END IF;
END$$
CALL app_refund_gateway_attempt()$$
DROP PROCEDURE app_refund_gateway_attempt$$
DELIMITER ;

-- ----- 20261120_booking_usage_markers -----
-- MySQL 8. Apply to the intended database before deploying with ddl-auto=validate.
-- Additive only. Existing rows keep NULL, which the application treats as legacy:
--   promotion_usage_reserved NULL -> usage is counted when the booking is paid (old behaviour);
--   spending_recorded NULL        -> a paid booking is assumed to be in the customer's spending.
DELIMITER $$
DROP PROCEDURE IF EXISTS app_booking_usage_markers$$
CREATE PROCEDURE app_booking_usage_markers()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='bookings' AND COLUMN_NAME='promotion_usage_reserved') THEN
        ALTER TABLE bookings ADD COLUMN promotion_usage_reserved BIT(1) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='bookings' AND COLUMN_NAME='spending_recorded') THEN
        ALTER TABLE bookings ADD COLUMN spending_recorded BIT(1) NULL;
    END IF;
    -- movie.sql used to omit the refund statuses; widen only an ENUM column that lacks them.
    IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='bookings' AND COLUMN_NAME='status' AND DATA_TYPE='enum'
        AND COLUMN_TYPE NOT LIKE '%''REFUNDED''%') THEN
        ALTER TABLE bookings MODIFY COLUMN status
            ENUM('PENDING','CANCELLED','EXPIRED','COMPLETED','REFUND_REQUESTED','REFUNDED') NULL;
    END IF;
END$$
CALL app_booking_usage_markers()$$
DROP PROCEDURE app_booking_usage_markers$$
DELIMITER ;

-- ----- Cột users.role: VARCHAR và chỉ giữ CHECK chk_users_role -----
-- Database cũ có thể có role dạng ENUM hoặc CHECK cũ thiếu MANAGER (trước đây DataSeedService tự
-- sửa lúc chạy). Nay schema chỉ đổi qua migration.
DELIMITER $$
DROP PROCEDURE IF EXISTS app_users_role_column$$
CREATE PROCEDURE app_users_role_column()
BEGIN
    DECLARE done BOOLEAN DEFAULT FALSE;
    DECLARE old_check VARCHAR(64);
    DECLARE checks CURSOR FOR
        SELECT tc.CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS tc
        JOIN information_schema.CHECK_CONSTRAINTS cc
          ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'users'
          AND tc.CONSTRAINT_TYPE = 'CHECK' AND LOWER(cc.CHECK_CLAUSE) LIKE '%role%'
          AND tc.CONSTRAINT_NAME <> 'chk_users_role';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    OPEN checks;
    drop_old: LOOP
        FETCH checks INTO old_check;
        IF done THEN LEAVE drop_old; END IF;
        SET @app_role_sql = CONCAT('ALTER TABLE users DROP CHECK `', old_check, '`');
        PREPARE app_role_stmt FROM @app_role_sql;
        EXECUTE app_role_stmt;
        DEALLOCATE PREPARE app_role_stmt;
    END LOOP;
    CLOSE checks;
    IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role' AND DATA_TYPE <> 'varchar') THEN
        ALTER TABLE users MODIFY COLUMN role VARCHAR(20) NULL;
    END IF;
END$$
CALL app_users_role_column()$$
DROP PROCEDURE app_users_role_column$$
DELIMITER ;

-- ----- 20261121_schema_integrity -----
-- MySQL 8. Đồng bộ database đang dùng với movie.sql: bảng/cột còn thiếu, index cho truy vấn
-- thường xuyên, NOT NULL, CHECK và khóa ngoại chi nhánh.
--
-- Điều kiện: đã áp dụng 20261112_refund_gateway_attempt.sql và 20261120_booking_usage_markers.sql.
-- Dừng backend và sao lưu trước khi chạy. Chạy lại được nhiều lần (mỗi bước kiểm tra trước khi thêm).
--
-- Bước 1 kiểm tra dữ liệu và DỪNG với thông báo cụ thể nếu có dữ liệu không thể tự sửa an toàn
-- (NULL bắt buộc, trùng lặp, tham chiếu mồ côi, giá trị âm). Sửa dữ liệu rồi chạy lại.
-- Bước 2 chỉ chuẩn hóa các giá trị NULL mà ứng dụng đã hiểu theo một nghĩa duy nhất.
-- Lưu ý: MySQL không rollback DDL; nếu dừng giữa chừng, sửa nguyên nhân rồi chạy lại toàn bộ file.

DELIMITER $$

DROP PROCEDURE IF EXISTS app_si_fail_if$$
CREATE PROCEDURE app_si_fail_if(IN bad_rows BIGINT, IN message VARCHAR(255))
BEGIN
    IF bad_rows > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = message;
    END IF;
END$$

DROP PROCEDURE IF EXISTS app_si_exec$$
CREATE PROCEDURE app_si_exec(IN statement_text TEXT)
BEGIN
    SET @app_si_sql = statement_text;
    PREPARE app_si_stmt FROM @app_si_sql;
    EXECUTE app_si_stmt;
    DEALLOCATE PREPARE app_si_stmt;
END$$

DROP PROCEDURE IF EXISTS app_si_add_column$$
CREATE PROCEDURE app_si_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN definition TEXT)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = tbl AND COLUMN_NAME = col) THEN
        CALL app_si_exec(CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', definition));
    END IF;
END$$

-- Giữ nguyên kiểu cột hiện có, chỉ thêm NOT NULL (và DEFAULT nếu truyền vào).
DROP PROCEDURE IF EXISTS app_si_not_null$$
CREATE PROCEDURE app_si_not_null(IN tbl VARCHAR(64), IN col VARCHAR(64), IN default_clause TEXT)
BEGIN
    DECLARE col_type TEXT;
    DECLARE nullable VARCHAR(3);
    SELECT COLUMN_TYPE, IS_NULLABLE INTO col_type, nullable FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col;
    IF nullable = 'YES' THEN
        CALL app_si_exec(CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN `', col, '` ', col_type,
            ' NOT NULL', IFNULL(CONCAT(' DEFAULT ', default_clause), '')));
    END IF;
END$$

DROP PROCEDURE IF EXISTS app_si_add_index$$
CREATE PROCEDURE app_si_add_index(
    IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols TEXT, IN is_unique BOOLEAN)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = tbl AND INDEX_NAME = idx) THEN
        CALL app_si_exec(CONCAT('ALTER TABLE `', tbl, '` ADD ', IF(is_unique, 'UNIQUE ', ''),
            'INDEX `', idx, '` (', cols, ')'));
    END IF;
END$$

DROP PROCEDURE IF EXISTS app_si_add_check$$
CREATE PROCEDURE app_si_add_check(IN tbl VARCHAR(64), IN name VARCHAR(64), IN expression TEXT)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl
        AND CONSTRAINT_NAME = name AND CONSTRAINT_TYPE = 'CHECK') THEN
        CALL app_si_exec(CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', name, '` CHECK (',
            expression, ')'));
    END IF;
END$$

-- Bỏ qua nếu cột đã có khóa ngoại tới bảng đích (dù tên khác).
DROP PROCEDURE IF EXISTS app_si_add_fk$$
CREATE PROCEDURE app_si_add_fk(
    IN tbl VARCHAR(64), IN name VARCHAR(64), IN col VARCHAR(64), IN ref_tbl VARCHAR(64))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
        AND REFERENCED_TABLE_NAME = ref_tbl) THEN
        CALL app_si_exec(CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', name,
            '` FOREIGN KEY (`', col, '`) REFERENCES `', ref_tbl, '` (`id`)'));
    END IF;
END$$

DROP PROCEDURE IF EXISTS app_schema_integrity$$
CREATE PROCEDURE app_schema_integrity()
BEGIN
    -- ===== 0. Bảng và cột chưa có trong movie.sql cũ (Hibernate update thường đã tạo) =====
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
      PRIMARY KEY (`id`)
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
      PRIMARY KEY (`id`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    CALL app_si_add_column('users', 'branch_id', 'BIGINT NULL');
    CALL app_si_add_column('foods', 'branch_id', 'BIGINT NULL');
    CALL app_si_add_column('foods', 'stock_quantity', 'INT NULL');
    CALL app_si_add_column('foods', 'low_stock_threshold', 'INT NULL');

    -- ===== 1. Dữ liệu không thể tự sửa: dừng và báo =====
    CALL app_si_fail_if((SELECT COUNT(*) FROM users WHERE username IS NULL OR password IS NULL),
        'users: co tai khoan thieu username/password; xoa hoac bo sung truoc khi chay lai');
    CALL app_si_fail_if((SELECT COUNT(*) FROM users
        WHERE role IS NOT NULL AND role NOT IN ('ADMIN', 'MANAGER', 'STAFF', 'USER')),
        'users.role: co gia tri ngoai ADMIN/MANAGER/STAFF/USER');
    CALL app_si_fail_if((SELECT COUNT(*) FROM users WHERE total_spending < 0),
        'users.total_spending: co gia tri am');
    CALL app_si_fail_if((SELECT COUNT(*) FROM genres WHERE name IS NULL OR TRIM(name) = ''),
        'genres.name: co the loai khong co ten');
    CALL app_si_fail_if((SELECT COUNT(*) FROM (SELECT name FROM genres GROUP BY name
        HAVING COUNT(*) > 1) duplicated), 'genres.name: co ten the loai trung nhau; gop lai truoc');
    CALL app_si_fail_if((SELECT COUNT(*) FROM bookings WHERE status IS NULL OR total_amount IS NULL),
        'bookings: co don thieu status/total_amount');
    CALL app_si_fail_if((SELECT COUNT(*) FROM bookings WHERE status NOT IN
        ('PENDING', 'CANCELLED', 'EXPIRED', 'COMPLETED', 'REFUND_REQUESTED', 'REFUNDED')),
        'bookings.status: co trang thai khong hop le');
    CALL app_si_fail_if((SELECT COUNT(*) FROM bookings
        WHERE total_amount < 0 OR discount_amount < 0), 'bookings: co so tien am');
    CALL app_si_fail_if((SELECT COUNT(*) FROM payments
        WHERE amount < 0 OR refund_amount < 0), 'payments: co so tien am');
    CALL app_si_fail_if((SELECT COUNT(*) FROM tickets WHERE price < 0), 'tickets.price: co gia am');
    CALL app_si_fail_if((SELECT COUNT(*) FROM (SELECT qr_code FROM tickets WHERE qr_code IS NOT NULL
        GROUP BY qr_code HAVING COUNT(*) > 1) duplicated),
        'tickets.qr_code: co ma QR trung nhau giua cac ve');
    CALL app_si_fail_if((SELECT COUNT(*) FROM showtimes WHERE ticket_price < 0),
        'showtimes.ticket_price: co gia am');
    CALL app_si_fail_if((SELECT COUNT(*) FROM booking_foods
        WHERE quantity <= 0 OR unit_price < 0 OR subtotal < 0),
        'booking_foods: co so luong <= 0 hoac so tien am');
    CALL app_si_fail_if((SELECT COUNT(*) FROM foods
        WHERE price < 0 OR stock_quantity < 0 OR low_stock_threshold < 0),
        'foods: co gia/ton kho am');
    CALL app_si_fail_if((SELECT COUNT(*) FROM promotions WHERE discount_percent NOT BETWEEN 0 AND 100
        OR max_discount < 0 OR min_order_amount < 0 OR usage_limit < 0 OR used_count < 0),
        'promotions: co phan tram giam ngoai 0-100 hoac so am');
    CALL app_si_fail_if((SELECT COUNT(*) FROM movie_ratings WHERE score NOT BETWEEN 1 AND 5),
        'movie_ratings.score: co diem ngoai 1-5');
    CALL app_si_fail_if((SELECT COUNT(*) FROM users u
        WHERE u.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = u.branch_id)),
        'users.branch_id: tro toi chi nhanh khong ton tai');
    CALL app_si_fail_if((SELECT COUNT(*) FROM foods f
        WHERE f.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = f.branch_id)),
        'foods.branch_id: tro toi chi nhanh khong ton tai');
    CALL app_si_fail_if((SELECT COUNT(*) FROM promotions p
        WHERE p.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = p.branch_id)),
        'promotions.branch_id: tro toi chi nhanh khong ton tai');

    -- ===== 2. Chuẩn hóa NULL theo đúng nghĩa ứng dụng đang dùng =====
    UPDATE promotions SET used_count = 0 WHERE used_count IS NULL;
    -- Ứng dụng coi active NULL là không hoạt động (Boolean.TRUE.equals(active)).
    UPDATE promotions SET active = b'0' WHERE active IS NULL;
    UPDATE foods SET active = b'0' WHERE active IS NULL;
    -- User.isEnabled() coi status NULL là ACTIVE.
    UPDATE users SET status = 'ACTIVE' WHERE status IS NULL;
    -- Không có role thì không cấp được token; đăng nhập Google cũng gán USER cho trường hợp này.
    UPDATE users SET role = 'USER' WHERE role IS NULL;
    UPDATE bookings SET discount_amount = 0 WHERE discount_amount IS NULL;

    -- ===== 3. NOT NULL =====
    CALL app_si_not_null('users', 'username', NULL);
    CALL app_si_not_null('users', 'password', NULL);
    CALL app_si_not_null('users', 'role', '''USER''');
    CALL app_si_not_null('users', 'status', '''ACTIVE''');
    CALL app_si_not_null('genres', 'name', NULL);
    CALL app_si_not_null('promotions', 'used_count', '0');
    CALL app_si_not_null('promotions', 'active', 'b''1''');
    CALL app_si_not_null('foods', 'active', 'b''1''');
    CALL app_si_not_null('bookings', 'total_amount', '0');
    CALL app_si_not_null('bookings', 'discount_amount', '0');
    -- movie.sql cũ khai báo bookings.status là ENUM (thiếu trạng thái hoàn tiền); dùng VARCHAR như
    -- Hibernate để thêm trạng thái không cần ALTER cột, CHECK bên dưới giữ giá trị hợp lệ.
    IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'status'
        AND (DATA_TYPE <> 'varchar' OR IS_NULLABLE = 'YES')) THEN
        ALTER TABLE bookings MODIFY COLUMN status VARCHAR(50) NOT NULL;
    END IF;

    -- ===== 4. Index và unique =====
    CALL app_si_add_index('tickets', 'uk_tickets_qr_code', '`qr_code`', TRUE);
    CALL app_si_add_index('genres', 'uk_genres_name', '`name`', TRUE);
    CALL app_si_add_index('bookings', 'idx_bookings_status_expires', '`status`, `expires_at`', FALSE);
    CALL app_si_add_index('bookings', 'idx_bookings_user_status_expires',
        '`user_id`, `status`, `expires_at`', FALSE);
    CALL app_si_add_index('showtimes', 'idx_showtimes_room_start', '`room_id`, `start_time`', FALSE);
    CALL app_si_add_index('showtimes', 'idx_showtimes_movie_start', '`movie_id`, `start_time`', FALSE);
    CALL app_si_add_index('notifications', 'idx_notifications_created_at', '`created_at`', FALSE);
    CALL app_si_add_index('audit_logs', 'idx_audit_logs_created_at', '`created_at`', FALSE);
    CALL app_si_add_index('users', 'idx_users_branch_id', '`branch_id`', FALSE);
    CALL app_si_add_index('foods', 'idx_foods_branch_id', '`branch_id`', FALSE);
    CALL app_si_add_index('promotions', 'idx_promotions_branch_id', '`branch_id`', FALSE);

    -- ===== 5. CHECK =====
    CALL app_si_add_check('users', 'chk_users_role', '`role` IN (''ADMIN'', ''MANAGER'', ''STAFF'', ''USER'')');
    CALL app_si_add_check('users', 'chk_users_total_spending',
        '`total_spending` IS NULL OR `total_spending` >= 0');
    CALL app_si_add_check('foods', 'chk_foods_price', '`price` >= 0');
    CALL app_si_add_check('foods', 'chk_foods_stock',
        '(`stock_quantity` IS NULL OR `stock_quantity` >= 0) AND (`low_stock_threshold` IS NULL OR `low_stock_threshold` >= 0)');
    CALL app_si_add_check('promotions', 'chk_promotions_discount', '`discount_percent` BETWEEN 0 AND 100');
    CALL app_si_add_check('promotions', 'chk_promotions_amounts',
        '(`max_discount` IS NULL OR `max_discount` >= 0) AND (`min_order_amount` IS NULL OR `min_order_amount` >= 0)');
    CALL app_si_add_check('promotions', 'chk_promotions_usage',
        '`used_count` >= 0 AND (`usage_limit` IS NULL OR `usage_limit` >= 0)');
    CALL app_si_add_check('showtimes', 'chk_showtimes_ticket_price', '`ticket_price` >= 0');
    CALL app_si_add_check('bookings', 'chk_bookings_status',
        '`status` IN (''PENDING'', ''CANCELLED'', ''EXPIRED'', ''COMPLETED'', ''REFUND_REQUESTED'', ''REFUNDED'')');
    CALL app_si_add_check('bookings', 'chk_bookings_amounts', '`total_amount` >= 0 AND `discount_amount` >= 0');
    CALL app_si_add_check('payments', 'chk_payments_amounts',
        '`amount` >= 0 AND (`refund_amount` IS NULL OR `refund_amount` >= 0)');
    CALL app_si_add_check('tickets', 'chk_tickets_price', '`price` >= 0');
    CALL app_si_add_check('booking_foods', 'chk_booking_foods_values',
        '`quantity` > 0 AND `unit_price` >= 0 AND `subtotal` >= 0');
    CALL app_si_add_check('movie_ratings', 'chk_movie_ratings_score', '`score` BETWEEN 1 AND 5');

    -- ===== 6. Khóa ngoại chi nhánh (RESTRICT: không xóa được chi nhánh còn nhân sự/món/khuyến mãi) =====
    CALL app_si_add_fk('users', 'fk_users_branch', 'branch_id', 'branches');
    CALL app_si_add_fk('foods', 'fk_foods_branch', 'branch_id', 'branches');
    CALL app_si_add_fk('promotions', 'fk_promotions_branch', 'branch_id', 'branches');
END$$

CALL app_schema_integrity()$$

DROP PROCEDURE app_schema_integrity$$
DROP PROCEDURE app_si_add_fk$$
DROP PROCEDURE app_si_add_check$$
DROP PROCEDURE app_si_add_index$$
DROP PROCEDURE app_si_not_null$$
DROP PROCEDURE app_si_add_column$$
DROP PROCEDURE app_si_exec$$
DROP PROCEDURE app_si_fail_if$$

DELIMITER ;
