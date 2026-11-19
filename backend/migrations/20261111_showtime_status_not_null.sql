-- MySQL 8. Back up the database and stop the backend before applying.
-- Status is mandatory; do not silently assign OPEN to an unknown schedule.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_showtime_status_not_null$$
CREATE PROCEDURE app_showtime_status_not_null()
BEGIN
    IF EXISTS (SELECT 1 FROM showtimes WHERE status IS NULL) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Assign OPEN, CLOSED or CANCELLED to NULL showtime statuses before migrating';
    END IF;
    ALTER TABLE showtimes MODIFY COLUMN status ENUM('OPEN','CLOSED','CANCELLED') NOT NULL;
END$$
CALL app_showtime_status_not_null()$$
DROP PROCEDURE app_showtime_status_not_null$$
DELIMITER ;
