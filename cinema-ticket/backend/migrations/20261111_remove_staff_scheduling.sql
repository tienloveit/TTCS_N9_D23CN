-- Select the intended database and back up staff_schedules and schedule notifications first.
-- This removes staff work assignments. Users, branches, bookings and payments are preserved.
DELETE FROM notifications WHERE type = 'STAFF_SCHEDULE';
DROP TABLE IF EXISTS staff_schedules;
ALTER TABLE notifications MODIFY COLUMN type
    ENUM('BOOKING_STATUS', 'LOW_STOCK', 'PROMOTION', 'REFUND_REQUEST', 'SYSTEM') NOT NULL;
