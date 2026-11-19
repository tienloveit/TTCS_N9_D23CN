-- MySQL 8. Stop the backend and back up the database before applying.
-- Existing INACTIVE movies must be assigned a supported status explicitly.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_remove_movie_inactive$$
CREATE PROCEDURE app_remove_movie_inactive()
BEGIN
    IF EXISTS (SELECT 1 FROM movies WHERE status = 'INACTIVE') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Assign INACTIVE movies to UPCOMING, NOW_SHOWING or ENDED before migrating';
    END IF;
    ALTER TABLE movies MODIFY COLUMN status ENUM('UPCOMING','NOW_SHOWING','ENDED') NULL DEFAULT NULL;
END$$
CALL app_remove_movie_inactive()$$
DROP PROCEDURE app_remove_movie_inactive$$
DELIMITER ;
