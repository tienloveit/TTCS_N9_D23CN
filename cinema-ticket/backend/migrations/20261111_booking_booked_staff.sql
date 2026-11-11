-- MySQL 8. Stop the backend and back up the database before applying.
-- RENAME COLUMN preserves the existing values, index, and foreign key to users(id).
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_booking_booked_staff$$
CREATE PROCEDURE app_booking_booked_staff()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
          AND COLUMN_NAME = 'staff_user_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
              AND COLUMN_NAME = 'booked_staff'
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Both staff columns exist; reconcile their data before migrating';
        END IF;
        ALTER TABLE bookings RENAME COLUMN staff_user_id TO booked_staff;
    ELSEIF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
          AND COLUMN_NAME = 'booked_staff'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected booking staff column is missing';
    END IF;
END$$
CALL app_booking_booked_staff()$$
DROP PROCEDURE app_booking_booked_staff$$
DELIMITER ;
