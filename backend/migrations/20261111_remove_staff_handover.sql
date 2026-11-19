-- Select the intended database and back up staff_shifts and affected notifications first.
-- Staff work schedules remain in staff_schedules. Bookings and payments are preserved.
DELETE FROM notifications WHERE type IN ('SHIFT_START', 'SHIFT_END', 'MISSED_SHIFT');
DROP TABLE IF EXISTS staff_shifts;

-- Retain notification types used by booking, inventory, schedule and system features.
ALTER TABLE notifications MODIFY COLUMN type
    ENUM('BOOKING_STATUS', 'LOW_STOCK', 'PROMOTION', 'REFUND_REQUEST', 'STAFF_SCHEDULE', 'SYSTEM');
