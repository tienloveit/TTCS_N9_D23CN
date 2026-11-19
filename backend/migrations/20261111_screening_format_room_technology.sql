-- MySQL 8.x. Back up the database and stop the backend first.
-- Legacy THREE_D rooms transfer 3D to their existing showtimes; other formats
-- default to 2D because IMAX/4DX alone does not identify 2D versus 3D.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_migrate_screening_technology$$
CREATE PROCEDURE app_migrate_screening_technology()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                   AND TABLE_NAME='showtimes' AND COLUMN_NAME='screening_format') THEN
        ALTER TABLE showtimes ADD COLUMN screening_format ENUM('TWO_D','THREE_D') NOT NULL DEFAULT 'TWO_D';
        IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                   AND TABLE_NAME='rooms' AND COLUMN_NAME='room_type') THEN
            UPDATE showtimes s JOIN rooms r ON s.room_id=r.id
                SET s.screening_format='THREE_D' WHERE r.room_type='THREE_D';
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                AND TABLE_NAME='rooms' AND COLUMN_NAME='room_type') THEN
        ALTER TABLE rooms MODIFY COLUMN room_type VARCHAR(30) NULL;
        UPDATE rooms SET room_type=CASE
            WHEN room_type IN ('IMAX','FOUR_DX','SCREEN_X','GOLD_CLASS') THEN room_type
            ELSE 'STANDARD' END;
        ALTER TABLE rooms CHANGE COLUMN room_type room_technology
            ENUM('STANDARD','IMAX','FOUR_DX','SCREEN_X','GOLD_CLASS') NOT NULL DEFAULT 'STANDARD';
    END IF;
END$$
CALL app_migrate_screening_technology()$$
DROP PROCEDURE app_migrate_screening_technology$$
DELIMITER ;
