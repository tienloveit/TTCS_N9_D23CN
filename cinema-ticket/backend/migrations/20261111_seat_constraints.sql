-- MySQL 8. Stop the backend and back up the database before applying.
-- This explicitly removes the obsolete is_active values.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_migrate_seat_constraints$$
CREATE PROCEDURE app_migrate_seat_constraints()
BEGIN
    IF EXISTS (SELECT 1 FROM seats WHERE seat_code IS NULL OR TRIM(seat_code) = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Correct missing seat codes before migrating';
    END IF;
    IF EXISTS (SELECT 1 FROM seats WHERE row_label IS NOT NULL AND seat_number IS NOT NULL
               GROUP BY room_id,row_label,seat_number HAVING COUNT(*) > 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolve duplicate room/row/seat positions before migrating';
    END IF;
    UPDATE seats SET seat_type='STANDARD' WHERE seat_type IS NULL;
    ALTER TABLE seats
        MODIFY COLUMN seat_code VARCHAR(255) NOT NULL,
        MODIFY COLUMN seat_type ENUM('STANDARD','VIP','COUPLE') NOT NULL DEFAULT 'STANDARD';
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
                   AND TABLE_NAME='seats' AND INDEX_NAME='uk_seats_room_row_number') THEN
        ALTER TABLE seats ADD CONSTRAINT uk_seats_room_row_number UNIQUE(room_id,row_label,seat_number);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                AND TABLE_NAME='seats' AND COLUMN_NAME='is_active') THEN
        ALTER TABLE seats DROP COLUMN is_active;
    END IF;
END$$
CALL app_migrate_seat_constraints()$$
DROP PROCEDURE app_migrate_seat_constraints$$
DELIMITER ;
