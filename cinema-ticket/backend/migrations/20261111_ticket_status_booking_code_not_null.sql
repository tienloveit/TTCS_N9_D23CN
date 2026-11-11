-- MySQL 8. Stop the backend and back up the database before applying.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_ticket_status_booking_code_not_null$$
CREATE PROCEDURE app_ticket_status_booking_code_not_null()
BEGIN
    IF EXISTS (SELECT 1 FROM tickets WHERE ticket_status IS NULL)
       OR EXISTS (SELECT 1 FROM bookings WHERE booking_code IS NULL) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Correct NULL ticket statuses or booking codes before migrating';
    END IF;
    ALTER TABLE tickets MODIFY COLUMN ticket_status ENUM('AVAILABLE','HOLDING','BOOKED') NOT NULL;
    ALTER TABLE bookings MODIFY COLUMN booking_code VARCHAR(255) NOT NULL;
END$$
CALL app_ticket_status_booking_code_not_null()$$
DROP PROCEDURE app_ticket_status_booking_code_not_null$$
DELIMITER ;
