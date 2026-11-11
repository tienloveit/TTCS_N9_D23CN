-- MySQL 8. Stop the backend and back up the database first.
-- Rename only: public/draft values and the existing default remain unchanged.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_rename_movie_public_flag$$
CREATE PROCEDURE app_rename_movie_public_flag()
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                AND TABLE_NAME='movies' AND COLUMN_NAME='published') THEN
        IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                    AND TABLE_NAME='movies' AND COLUMN_NAME='is_public') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Both published and is_public exist; reconcile values first';
        END IF;
        ALTER TABLE movies RENAME COLUMN published TO is_public;
    END IF;
END$$
CALL app_rename_movie_public_flag()$$
DROP PROCEDURE app_rename_movie_public_flag$$
DELIMITER ;
