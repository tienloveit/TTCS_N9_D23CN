-- MySQL 8.0.16+. Back up the database and stop the backend before applying.
-- Invalid schedules require correction; this migration never invents times.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_showtime_time_constraints$$
CREATE PROCEDURE app_showtime_time_constraints()
BEGIN
    IF EXISTS (SELECT 1 FROM showtimes WHERE start_time IS NULL OR end_time IS NULL OR end_time<=start_time) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Correct NULL or non-increasing showtime windows before migrating';
    END IF;
    ALTER TABLE showtimes
        MODIFY COLUMN start_time DATETIME(6) NOT NULL,
        MODIFY COLUMN end_time DATETIME(6) NOT NULL;
    IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
                   AND TABLE_NAME='showtimes' AND CONSTRAINT_NAME='chk_showtimes_end_after_start') THEN
        ALTER TABLE showtimes ADD CONSTRAINT chk_showtimes_end_after_start CHECK(end_time>start_time);
    END IF;
END$$
CALL app_showtime_time_constraints()$$
DROP PROCEDURE app_showtime_time_constraints$$
DELIMITER ;
