-- MySQL 8. Stop the backend and back up cinema before running this migration.
-- One payment per booking, matching the existing payment/refund workflow.
-- Copy and compare all legacy values before dropping any legacy columns.
USE cinema;
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

DELIMITER $$
DROP PROCEDURE IF EXISTS app_extract_booking_payments$$
CREATE PROCEDURE app_extract_booking_payments()
BEGIN
    DECLARE old_columns INT;
    DECLARE fk_drops TEXT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT COUNT(*) INTO old_columns FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME IN ('payment_method', 'payment_status', 'provider_txn_id', 'paid_at', 'payment_created_at', 'refund_reason', 'refund_process_note', 'refund_processed_by', 'refund_processed_at', 'refunded_at', 'refund_amount');
    IF old_columns NOT IN (0, 11) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Incomplete legacy payment columns; restore or reconcile before migrating';
    END IF;

    IF old_columns = 11 THEN
        START TRANSACTION;
        INSERT INTO payments (booking_id, amount, `payment_method`, `payment_status`, `provider_txn_id`, `paid_at`, `payment_created_at`, `refund_reason`, `refund_process_note`, `refund_processed_by`, `refund_processed_at`, `refunded_at`, `refund_amount`, created_at, updated_at)
        SELECT b.id, COALESCE(b.total_amount, 0), b.`payment_method`, b.`payment_status`, b.`provider_txn_id`, b.`paid_at`, b.`payment_created_at`, b.`refund_reason`, b.`refund_process_note`, b.`refund_processed_by`, b.`refund_processed_at`, b.`refunded_at`, b.`refund_amount`,
               COALESCE(b.payment_created_at, b.created_at, b.paid_at, CURRENT_TIMESTAMP(6)),
               COALESCE(b.updated_at, b.payment_created_at, b.created_at, CURRENT_TIMESTAMP(6))
        FROM bookings b
        WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.id);

        IF EXISTS (
            SELECT 1 FROM bookings b LEFT JOIN payments p ON p.booking_id = b.id
            WHERE p.id IS NULL OR NOT (
                (p.amount <=> COALESCE(b.total_amount, 0))
                AND (CAST(p.`payment_method` AS BINARY) <=> CAST(b.`payment_method` AS BINARY))
                AND (CAST(p.`payment_status` AS BINARY) <=> CAST(b.`payment_status` AS BINARY))
                AND (CAST(p.`provider_txn_id` AS BINARY) <=> CAST(b.`provider_txn_id` AS BINARY))
                AND (p.`paid_at` <=> b.`paid_at`)
                AND (p.`payment_created_at` <=> b.`payment_created_at`)
                AND (CAST(p.`refund_reason` AS BINARY) <=> CAST(b.`refund_reason` AS BINARY))
                AND (CAST(p.`refund_process_note` AS BINARY) <=> CAST(b.`refund_process_note` AS BINARY))
                AND (p.`refund_processed_by` <=> b.`refund_processed_by`)
                AND (p.`refund_processed_at` <=> b.`refund_processed_at`)
                AND (p.`refunded_at` <=> b.`refunded_at`)
                AND (p.`refund_amount` <=> b.`refund_amount`)
            )
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Payment copy differs from booking data; legacy columns preserved';
        END IF;
        COMMIT;

        SELECT GROUP_CONCAT(DISTINCT CONCAT('DROP FOREIGN KEY `',
                   REPLACE(CONSTRAINT_NAME, '`', '``'), '`') SEPARATOR ', ')
        INTO fk_drops FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
          AND COLUMN_NAME = 'refund_processed_by' AND REFERENCED_TABLE_NAME IS NOT NULL;
        SET @payment_extract_ddl = CONCAT('ALTER TABLE bookings ',
            IF(fk_drops IS NULL, '', CONCAT(fk_drops, ', ')),
            'DROP COLUMN `payment_method`, DROP COLUMN `payment_status`, DROP COLUMN `provider_txn_id`, DROP COLUMN `paid_at`, DROP COLUMN `payment_created_at`, DROP COLUMN `refund_reason`, DROP COLUMN `refund_process_note`, DROP COLUMN `refund_processed_by`, DROP COLUMN `refund_processed_at`, DROP COLUMN `refunded_at`, DROP COLUMN `refund_amount`');
        PREPARE payment_extract_stmt FROM @payment_extract_ddl;
        EXECUTE payment_extract_stmt;
        DEALLOCATE PREPARE payment_extract_stmt;
    ELSEIF EXISTS (
        SELECT 1 FROM bookings b LEFT JOIN payments p ON p.booking_id = b.id
        WHERE p.id IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking without payment found after extraction; restore payment data';
    END IF;
END$$
CALL app_extract_booking_payments()$$
DROP PROCEDURE app_extract_booking_payments$$
DELIMITER ;
