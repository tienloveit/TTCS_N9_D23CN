-- MySQL 8. Apply to the intended database before deploying with ddl-auto=validate.
-- Additive only. Existing refund records are NOT asserted to be gateway-confirmed.
DELIMITER $$
DROP PROCEDURE IF EXISTS app_refund_gateway_attempt$$
CREATE PROCEDURE app_refund_gateway_attempt()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_request_id') THEN
        ALTER TABLE payments ADD COLUMN refund_request_id VARCHAR(32) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_gateway_status') THEN
        ALTER TABLE payments ADD COLUMN refund_gateway_status VARCHAR(20) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_requested_at') THEN
        ALTER TABLE payments ADD COLUMN refund_requested_at DATETIME(6) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_gateway_code') THEN
        ALTER TABLE payments ADD COLUMN refund_gateway_code VARCHAR(10) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='payments' AND COLUMN_NAME='refund_gateway_message') THEN
        ALTER TABLE payments ADD COLUMN refund_gateway_message VARCHAR(500) NULL;
    END IF;
END$$
CALL app_refund_gateway_attempt()$$
DROP PROCEDURE app_refund_gateway_attempt$$
DELIMITER ;
