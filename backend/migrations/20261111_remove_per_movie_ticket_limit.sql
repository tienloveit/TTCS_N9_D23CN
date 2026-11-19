-- Select the intended database. This removes only the retired cumulative movie limit.
-- The separate booking.maxTicketsPerTransaction setting and all bookings are preserved.
DELETE FROM system_settings WHERE setting_key = 'booking.maxTicketsPerMovie';
