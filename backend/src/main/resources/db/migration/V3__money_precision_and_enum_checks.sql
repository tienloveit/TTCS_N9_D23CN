-- V3: thống nhất kiểu tiền và ràng buộc giá trị cho enum lưu dạng VARCHAR.
--
-- Tiền: mọi cột số tiền dùng DECIMAL(15,2) (tối đa 9.999.999.999.999,99 đồng). Trước đây trộn
-- DECIMAL(38,2), (15,2) và (12,2). Dừng với thông báo nếu có giá trị không vừa kiểu mới.
--
-- Enum: cột ENUM của MySQL giữ nguyên; enum lưu dạng VARCHAR luôn có CHECK liệt kê giá trị hợp lệ
-- (bổ sung cho payments.payment_status và payments.refund_gateway_status). Thêm giá trị enum mới
-- trong Java đồng nghĩa phải có migration cập nhật ENUM/CHECK tương ứng.

DELIMITER $$

DROP PROCEDURE IF EXISTS app_v3_fail_if$$
CREATE PROCEDURE app_v3_fail_if(IN bad_rows BIGINT, IN message VARCHAR(255))
BEGIN
    IF bad_rows > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = message;
    END IF;
END$$

DROP PROCEDURE IF EXISTS app_v3_add_check$$
CREATE PROCEDURE app_v3_add_check(IN tbl VARCHAR(64), IN name VARCHAR(64), IN expression TEXT)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl
        AND CONSTRAINT_NAME = name AND CONSTRAINT_TYPE = 'CHECK') THEN
        SET @app_v3_sql = CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', name, '` CHECK (',
            expression, ')');
        PREPARE app_v3_stmt FROM @app_v3_sql;
        EXECUTE app_v3_stmt;
        DEALLOCATE PREPARE app_v3_stmt;
    END IF;
END$$

DROP PROCEDURE IF EXISTS app_v3$$
CREATE PROCEDURE app_v3()
BEGIN
    DECLARE money_limit DECIMAL(38, 2) DEFAULT 9999999999999.99;

    CALL app_v3_fail_if((SELECT COUNT(*) FROM bookings
        WHERE total_amount > money_limit OR discount_amount > money_limit),
        'bookings: so tien vuot DECIMAL(15,2)');
    CALL app_v3_fail_if((SELECT COUNT(*) FROM payments
        WHERE amount > money_limit OR refund_amount > money_limit),
        'payments: so tien vuot DECIMAL(15,2)');
    CALL app_v3_fail_if((SELECT COUNT(*) FROM tickets WHERE price > money_limit),
        'tickets.price: vuot DECIMAL(15,2)');
    CALL app_v3_fail_if((SELECT COUNT(*) FROM showtimes WHERE ticket_price > money_limit),
        'showtimes.ticket_price: vuot DECIMAL(15,2)');
    CALL app_v3_fail_if((SELECT COUNT(*) FROM payments WHERE payment_status IS NOT NULL
        AND payment_status NOT IN ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')),
        'payments.payment_status: co gia tri khong hop le');
    CALL app_v3_fail_if((SELECT COUNT(*) FROM payments WHERE refund_gateway_status IS NOT NULL
        AND refund_gateway_status NOT IN ('PROCESSING', 'UNKNOWN', 'FAILED', 'SUCCEEDED')),
        'payments.refund_gateway_status: co gia tri khong hop le');
END$$

CALL app_v3()$$

DROP PROCEDURE app_v3$$

DELIMITER ;

-- Sau V2 mọi database có cùng định nghĩa cột, nên MODIFY tường minh giữ nguyên NULL/DEFAULT.
ALTER TABLE bookings
    MODIFY COLUMN total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    MODIFY COLUMN discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE payments
    MODIFY COLUMN amount DECIMAL(15, 2) NOT NULL,
    MODIFY COLUMN refund_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE tickets MODIFY COLUMN price DECIMAL(15, 2) NOT NULL;
ALTER TABLE showtimes MODIFY COLUMN ticket_price DECIMAL(15, 2) NOT NULL DEFAULT 75000;
ALTER TABLE foods MODIFY COLUMN price DECIMAL(15, 2) NOT NULL;
ALTER TABLE booking_foods
    MODIFY COLUMN unit_price DECIMAL(15, 2) NOT NULL,
    MODIFY COLUMN subtotal DECIMAL(15, 2) NOT NULL;

-- Database do Hibernate update tạo có cột này dạng ENUM; script 20261112 tạo VARCHAR(20).
-- Thống nhất VARCHAR(20) như entity (@JdbcTypeCode VARCHAR), giá trị giữ nguyên.
ALTER TABLE payments MODIFY COLUMN refund_gateway_status VARCHAR(20) NULL;

DELIMITER $$
CALL app_v3_add_check('payments', 'chk_payments_status',
    '`payment_status` IN (''PENDING'', ''PAID'', ''CANCELLED'', ''REFUNDED'')')$$
CALL app_v3_add_check('payments', 'chk_payments_refund_gateway_status',
    '`refund_gateway_status` IN (''PROCESSING'', ''UNKNOWN'', ''FAILED'', ''SUCCEEDED'')')$$
DROP PROCEDURE app_v3_add_check$$
DROP PROCEDURE app_v3_fail_if$$
DELIMITER ;
