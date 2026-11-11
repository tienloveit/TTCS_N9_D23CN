-- MySQL 8.x. Stop the backend and back up the database first.
-- Unknown historical timestamps are initialized at migration time.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_movie_timestamps_director_names$$
CREATE PROCEDURE app_movie_timestamps_director_names()
BEGIN
    DECLARE finished BOOLEAN DEFAULT FALSE;
    DECLARE unique_index VARCHAR(64);
    DECLARE unique_names CURSOR FOR
        SELECT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='directors' AND NON_UNIQUE=0 AND INDEX_NAME<>'PRIMARY'
        GROUP BY INDEX_NAME HAVING COUNT(*)=1 AND MAX(COLUMN_NAME)='name';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished=TRUE;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                   AND TABLE_NAME='movies' AND COLUMN_NAME='created_at') THEN
        ALTER TABLE movies ADD COLUMN created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                   AND TABLE_NAME='movies' AND COLUMN_NAME='updated_at') THEN
        ALTER TABLE movies ADD COLUMN updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);
    END IF;
    UPDATE movies SET created_at=CURRENT_TIMESTAMP(6) WHERE created_at IS NULL;
    UPDATE movies SET updated_at=created_at WHERE updated_at IS NULL;
    ALTER TABLE movies
        MODIFY COLUMN created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        MODIFY COLUMN updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);

    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
                   AND TABLE_NAME='directors' AND INDEX_NAME='idx_directors_name') THEN
        ALTER TABLE directors ADD INDEX idx_directors_name(name);
    END IF;
    OPEN unique_names;
    drop_names: LOOP
        FETCH unique_names INTO unique_index;
        IF finished THEN LEAVE drop_names; END IF;
        SET @drop_director_unique=CONCAT('ALTER TABLE directors DROP INDEX `',REPLACE(unique_index,'`','``'),'`');
        PREPARE stmt FROM @drop_director_unique;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    CLOSE unique_names;
END$$
CALL app_movie_timestamps_director_names()$$
DROP PROCEDURE app_movie_timestamps_director_names$$
DELIMITER ;
