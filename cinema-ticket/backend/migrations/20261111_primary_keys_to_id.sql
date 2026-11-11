-- MySQL 8.x. Stop the backend before running this migration, then restart it
-- with the updated entity mappings. Back up the database first.
-- RENAME COLUMN preserves values, AUTO_INCREMENT, indexes and foreign keys.
-- Composite primary keys (for example movie_genres) are intentionally retained.
-- Safe to run again: single-column primary keys already named id are skipped.
USE cinema;

DELIMITER $$
DROP PROCEDURE IF EXISTS app_migrate_primary_keys_to_id$$
CREATE PROCEDURE app_migrate_primary_keys_to_id()
BEGIN
    DECLARE finished BOOLEAN DEFAULT FALSE;
    DECLARE target_table VARCHAR(64);
    DECLARE old_column VARCHAR(64);
    DECLARE primary_keys CURSOR FOR
        SELECT k.TABLE_NAME, MAX(k.COLUMN_NAME)
        FROM information_schema.KEY_COLUMN_USAGE k
        JOIN information_schema.TABLES t
          ON t.TABLE_SCHEMA = k.TABLE_SCHEMA AND t.TABLE_NAME = k.TABLE_NAME
        WHERE k.TABLE_SCHEMA = DATABASE() AND k.CONSTRAINT_NAME = 'PRIMARY'
          AND t.TABLE_TYPE = 'BASE TABLE'
        GROUP BY k.TABLE_NAME
        HAVING COUNT(*) = 1 AND MAX(k.COLUMN_NAME) <> 'id'
        ORDER BY k.TABLE_NAME;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished = TRUE;

    -- Check all conflicts before the first ALTER (MySQL DDL auto-commits).
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS c
        JOIN (
            SELECT TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'PRIMARY'
            GROUP BY TABLE_NAME
            HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME) <> 'id'
        ) p ON p.TABLE_NAME = c.TABLE_NAME
        WHERE c.TABLE_SCHEMA = DATABASE() AND c.COLUMN_NAME = 'id'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot rename primary key: a non-primary id column already exists';
    END IF;

    OPEN primary_keys;
    rename_loop: LOOP
        FETCH primary_keys INTO target_table, old_column;
        IF finished THEN LEAVE rename_loop; END IF;
        SET @rename_primary_key_sql = CONCAT(
            'ALTER TABLE `', REPLACE(target_table, '`', '``'),
            '` RENAME COLUMN `', REPLACE(old_column, '`', '``'), '` TO `id`');
        PREPARE rename_statement FROM @rename_primary_key_sql;
        EXECUTE rename_statement;
        DEALLOCATE PREPARE rename_statement;
    END LOOP;
    CLOSE primary_keys;
END$$
CALL app_migrate_primary_keys_to_id()$$
DROP PROCEDURE app_migrate_primary_keys_to_id$$
DELIMITER ;
