-- Run with the intended database selected. Back up before applying.
-- Existing ticket/booking/payment amounts are historical snapshots and are preserved.
SET @add_ticket_price = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'showtimes' AND COLUMN_NAME = 'ticket_price'),
    'SELECT 1',
    'ALTER TABLE showtimes ADD COLUMN ticket_price DECIMAL(38,2) NULL');
PREPARE price_migration FROM @add_ticket_price;
EXECUTE price_migration;
DEALLOCATE PREPARE price_migration;

-- Legacy showtimes take their lowest existing positive ticket price as the base.
-- Seeded showtimes without tickets start at 75000; new API requests must enter a price.
UPDATE showtimes s
LEFT JOIN (SELECT showtime_id, MIN(price) AS base_price FROM tickets WHERE price > 0 GROUP BY showtime_id) t
    ON t.showtime_id = s.id
SET s.ticket_price = COALESCE(t.base_price, 75000)
WHERE s.ticket_price IS NULL OR s.ticket_price <= 0;

ALTER TABLE showtimes MODIFY COLUMN ticket_price DECIMAL(38,2) NOT NULL DEFAULT 75000;

-- Only unsold inventory adopts the common price. Never alter reserved/sold tickets.
UPDATE tickets t JOIN showtimes s ON s.id = t.showtime_id
SET t.price = s.ticket_price
WHERE t.booking_id IS NULL AND t.ticket_status = 'AVAILABLE';

DROP TABLE IF EXISTS seat_type_prices;
