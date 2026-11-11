-- MySQL 8.x. Back up the database and stop the backend before running.
-- Existing timestamps are initialized to migration time when unknown.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_migrate_branch_room_constraints$$
CREATE PROCEDURE app_migrate_branch_room_constraints()
BEGIN
    -- Refuse to truncate codes or silently invent missing business identifiers.
    IF EXISTS (SELECT 1 FROM branches WHERE branch_code IS NULL OR TRIM(branch_code) = '')
       OR EXISTS (SELECT 1 FROM rooms WHERE code IS NULL OR TRIM(code) = '' OR CHAR_LENGTH(code) > 50) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Correct missing branch/room codes and room codes longer than 50 characters first';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'created_at') THEN
        ALTER TABLE branches ADD COLUMN created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' AND COLUMN_NAME = 'updated_at') THEN
        ALTER TABLE branches ADD COLUMN updated_at DATETIME(6) NOT NULL
            DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);
    END IF;
    UPDATE branches SET status = 'ACTIVE' WHERE status IS NULL;
    UPDATE branches SET created_at = CURRENT_TIMESTAMP(6) WHERE created_at IS NULL;
    UPDATE branches SET updated_at = created_at WHERE updated_at IS NULL;
    UPDATE rooms SET status = 'ACTIVE' WHERE status IS NULL;
    ALTER TABLE branches
        MODIFY COLUMN branch_code VARCHAR(255) NOT NULL,
        MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        MODIFY COLUMN created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        MODIFY COLUMN updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);
    ALTER TABLE rooms
        MODIFY COLUMN code VARCHAR(50) NOT NULL,
        MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE';
END$$
CALL app_migrate_branch_room_constraints()$$
DROP PROCEDURE app_migrate_branch_room_constraints$$
DELIMITER ;
