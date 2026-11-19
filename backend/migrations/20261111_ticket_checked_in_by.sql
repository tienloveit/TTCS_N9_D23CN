-- MySQL 8. Back up the database and stop the backend first.
-- Legacy check-ins have no reliable actor: retain NULL, never invent one.
USE cinema;
DELIMITER $$
DROP PROCEDURE IF EXISTS app_ticket_checked_in_by$$
CREATE PROCEDURE app_ticket_checked_in_by()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
                   AND TABLE_NAME='tickets' AND COLUMN_NAME='checked_in_by') THEN
        ALTER TABLE tickets ADD COLUMN checked_in_by BIGINT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
                   AND TABLE_NAME='tickets' AND INDEX_NAME='idx_tickets_checked_in_by') THEN
        ALTER TABLE tickets ADD INDEX idx_tickets_checked_in_by(checked_in_by);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
                   AND TABLE_NAME='tickets' AND CONSTRAINT_NAME='fk_tickets_checked_in_by') THEN
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_checked_in_by FOREIGN KEY(checked_in_by) REFERENCES users(id);
    END IF;
END$$
CALL app_ticket_checked_in_by()$$
DROP PROCEDURE app_ticket_checked_in_by$$
DELIMITER ;
