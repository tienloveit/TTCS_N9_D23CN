-- Seed script runs on every startup (idempotent inserts)

INSERT INTO roles (name)
VALUES ('ADMIN'), ('STAFF'), ('CUSTOMER')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO cities (name)
VALUES ('Ha Noi'), ('Ho Chi Minh')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO cinemas (name, address, city_id)
SELECT 'CGV Vincom Thu Duc', '216 Vo Van Ngan, Thu Duc', c.id
FROM cities c
WHERE c.name = 'Ho Chi Minh'
  AND NOT EXISTS (
    SELECT 1 FROM cinemas x
    WHERE x.name = 'CGV Vincom Thu Duc'
      AND x.address = '216 Vo Van Ngan, Thu Duc'
  );

INSERT INTO rooms (cinema_id, name, capacity)
SELECT c.id, 'Room 1', 50
FROM cinemas c
WHERE c.name = 'CGV Vincom Thu Duc'
  AND NOT EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.cinema_id = c.id
      AND r.name = 'Room 1'
  );

INSERT INTO seats (room_id, row_char, number, is_active, seat_type)
SELECT r.id, 'A', 1, TRUE, 'STANDARD'
FROM rooms r
WHERE r.name = 'Room 1'
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  seat_type = VALUES(seat_type);

INSERT INTO seats (room_id, row_char, number, is_active, seat_type)
SELECT r.id, 'A', 2, TRUE, 'STANDARD'
FROM rooms r
WHERE r.name = 'Room 1'
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  seat_type = VALUES(seat_type);

INSERT INTO seats (room_id, row_char, number, is_active, seat_type)
SELECT r.id, 'A', 3, TRUE, 'VIP'
FROM rooms r
WHERE r.name = 'Room 1'
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  seat_type = VALUES(seat_type);

INSERT INTO genres (name)
VALUES ('Action'), ('Comedy'), ('Drama')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO movies (title, duration, release_date, language, age_rating, poster_url, trailer_url, status, description)
SELECT 'Nhiem Vu Bat Kha Thi', 120, '2026-03-01', 'English', 16,
       'https://example.com/posters/mission.jpg', 'https://example.com/trailers/mission',
       'NOW_SHOWING', 'Phim hanh dong mau lua'
WHERE NOT EXISTS (
    SELECT 1 FROM movies m
    WHERE m.title = 'Nhiem Vu Bat Kha Thi'
      AND m.release_date = '2026-03-01'
);

INSERT INTO movies (title, duration, release_date, language, age_rating, poster_url, trailer_url, status, description)
SELECT 'Gia Dinh Sieu Quay', 105, '2026-05-15', 'Vietnamese', 13,
       'https://example.com/posters/family.jpg', 'https://example.com/trailers/family',
       'COMING_SOON', 'Phim hai gia dinh'
WHERE NOT EXISTS (
    SELECT 1 FROM movies m
    WHERE m.title = 'Gia Dinh Sieu Quay'
      AND m.release_date = '2026-05-15'
);

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Action'
WHERE m.title = 'Nhiem Vu Bat Kha Thi'
ON DUPLICATE KEY UPDATE movie_id = VALUES(movie_id);

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Comedy'
WHERE m.title = 'Gia Dinh Sieu Quay'
ON DUPLICATE KEY UPDATE movie_id = VALUES(movie_id);

INSERT INTO showtimes (movie_id, room_id, start_time, end_time)
SELECT m.id, r.id, '2026-04-12 19:00:00', '2026-04-12 21:00:00'
FROM movies m
JOIN rooms r ON r.name = 'Room 1'
WHERE m.title = 'Nhiem Vu Bat Kha Thi'
  AND NOT EXISTS (
    SELECT 1 FROM showtimes s
    WHERE s.movie_id = m.id
      AND s.room_id = r.id
      AND s.start_time = '2026-04-12 19:00:00'
  );

INSERT INTO food (name, price, image_url)
SELECT 'Bap Nuoc Combo', 89000.00, 'https://example.com/food/combo.jpg'
WHERE NOT EXISTS (
    SELECT 1 FROM food f WHERE f.name = 'Bap Nuoc Combo'
);

INSERT INTO food (name, price, image_url)
SELECT 'Khoai Tay Chien', 45000.00, 'https://example.com/food/fries.jpg'
WHERE NOT EXISTS (
    SELECT 1 FROM food f WHERE f.name = 'Khoai Tay Chien'
);

INSERT INTO users (
  role_id, full_name, email, password, phone, is_active, email_verified, last_login, points, created_at
)
SELECT r.id, 'Admin Demo', 'admin@demo.local', '{noop}Demo@12345', '0900000001', TRUE, TRUE, NOW(), 0, NOW()
FROM roles r
WHERE r.name = 'ADMIN'
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  full_name = VALUES(full_name),
  password = VALUES(password),
  is_active = VALUES(is_active),
  email_verified = VALUES(email_verified),
  last_login = VALUES(last_login);

INSERT INTO cinemas (name, address, city_id)
SELECT 'CGV Aeon Ha Dong', 'Duong Tran Phu, Ha Dong', c.id
FROM cities c
WHERE c.name = 'Ha Noi'
  AND NOT EXISTS (
    SELECT 1 FROM cinemas x
    WHERE x.name = 'CGV Aeon Ha Dong'
      AND x.address = 'Duong Tran Phu, Ha Dong'
  );

INSERT INTO rooms (cinema_id, name, capacity)
SELECT c.id, 'Room 2', 80
FROM cinemas c
WHERE c.name = 'CGV Vincom Thu Duc'
  AND NOT EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.cinema_id = c.id
      AND r.name = 'Room 2'
  );

INSERT INTO rooms (cinema_id, name, capacity)
SELECT c.id, 'Room A', 60
FROM cinemas c
WHERE c.name = 'CGV Aeon Ha Dong'
  AND NOT EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.cinema_id = c.id
      AND r.name = 'Room A'
  );

INSERT INTO seats (room_id, row_char, number, is_active, seat_type)
SELECT r.id, s.row_char, s.number, TRUE, s.seat_type
FROM rooms r
JOIN (
  SELECT 'A' AS row_char, 1 AS number, 'STANDARD' AS seat_type
  UNION ALL SELECT 'A', 2, 'STANDARD'
  UNION ALL SELECT 'A', 3, 'VIP'
  UNION ALL SELECT 'B', 1, 'STANDARD'
  UNION ALL SELECT 'B', 2, 'STANDARD'
  UNION ALL SELECT 'B', 3, 'VIP'
) s
WHERE r.name = 'Room 2'
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  seat_type = VALUES(seat_type);

INSERT INTO seats (room_id, row_char, number, is_active, seat_type)
SELECT r.id, s.row_char, s.number, TRUE, s.seat_type
FROM rooms r
JOIN (
  SELECT 'A' AS row_char, 1 AS number, 'STANDARD' AS seat_type
  UNION ALL SELECT 'A', 2, 'STANDARD'
  UNION ALL SELECT 'A', 3, 'VIP'
  UNION ALL SELECT 'C', 1, 'STANDARD'
  UNION ALL SELECT 'C', 2, 'STANDARD'
  UNION ALL SELECT 'C', 3, 'VIP'
) s
WHERE r.name = 'Room A'
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  seat_type = VALUES(seat_type);

INSERT INTO genres (name)
VALUES ('Sci-Fi'), ('Romance'), ('Animation')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO movies (title, duration, release_date, language, age_rating, poster_url, trailer_url, status, description)
SELECT 'Hanh Tinh Do', 130, '2026-02-20', 'English', 16,
       'https://example.com/posters/planet.jpg', 'https://example.com/trailers/planet',
       'NOW_SHOWING', 'Phieu luu vien tuong'
WHERE NOT EXISTS (
    SELECT 1 FROM movies m
    WHERE m.title = 'Hanh Tinh Do'
      AND m.release_date = '2026-02-20'
);

INSERT INTO movies (title, duration, release_date, language, age_rating, poster_url, trailer_url, status, description)
SELECT 'Mua He Nam Ay', 112, '2026-06-10', 'Vietnamese', 13,
       'https://example.com/posters/summer.jpg', 'https://example.com/trailers/summer',
       'COMING_SOON', 'Tinh cam hoc duong'
WHERE NOT EXISTS (
    SELECT 1 FROM movies m
    WHERE m.title = 'Mua He Nam Ay'
      AND m.release_date = '2026-06-10'
);

INSERT INTO movies (title, duration, release_date, language, age_rating, poster_url, trailer_url, status, description)
SELECT 'Meo Phi Hanh Gia', 95, '2026-01-05', 'Vietnamese', 0,
       'https://example.com/posters/cat.jpg', 'https://example.com/trailers/cat',
       'NOW_SHOWING', 'Hoat hinh gia dinh'
WHERE NOT EXISTS (
    SELECT 1 FROM movies m
    WHERE m.title = 'Meo Phi Hanh Gia'
      AND m.release_date = '2026-01-05'
);

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Sci-Fi'
WHERE m.title = 'Hanh Tinh Do'
ON DUPLICATE KEY UPDATE movie_id = VALUES(movie_id);

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Action'
WHERE m.title = 'Hanh Tinh Do'
ON DUPLICATE KEY UPDATE movie_id = VALUES(movie_id);

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Romance'
WHERE m.title = 'Mua He Nam Ay'
ON DUPLICATE KEY UPDATE movie_id = VALUES(movie_id);

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Drama'
WHERE m.title = 'Mua He Nam Ay'
ON DUPLICATE KEY UPDATE movie_id = VALUES(movie_id);

INSERT INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id
FROM movies m
JOIN genres g ON g.name = 'Animation'
WHERE m.title = 'Meo Phi Hanh Gia'
ON DUPLICATE KEY UPDATE movie_id = VALUES(movie_id);

INSERT INTO showtimes (movie_id, room_id, start_time, end_time)
SELECT m.id, r.id, '2026-04-12 21:15:00', '2026-04-12 23:25:00'
FROM movies m
JOIN rooms r ON r.name = 'Room 2'
WHERE m.title = 'Hanh Tinh Do'
  AND NOT EXISTS (
    SELECT 1 FROM showtimes s
    WHERE s.movie_id = m.id
      AND s.room_id = r.id
      AND s.start_time = '2026-04-12 21:15:00'
  );

INSERT INTO showtimes (movie_id, room_id, start_time, end_time)
SELECT m.id, r.id, '2026-04-13 18:30:00', '2026-04-13 20:05:00'
FROM movies m
JOIN rooms r ON r.name = 'Room A'
WHERE m.title = 'Meo Phi Hanh Gia'
  AND NOT EXISTS (
    SELECT 1 FROM showtimes s
    WHERE s.movie_id = m.id
      AND s.room_id = r.id
      AND s.start_time = '2026-04-13 18:30:00'
  );

INSERT INTO showtimes (movie_id, room_id, start_time, end_time)
SELECT m.id, r.id, '2026-05-16 20:00:00', '2026-05-16 21:52:00'
FROM movies m
JOIN rooms r ON r.name = 'Room 1'
WHERE m.title = 'Mua He Nam Ay'
  AND NOT EXISTS (
    SELECT 1 FROM showtimes s
    WHERE s.movie_id = m.id
      AND s.room_id = r.id
      AND s.start_time = '2026-05-16 20:00:00'
  );

INSERT INTO food (name, price, image_url)
SELECT 'Tra Dao Cam Sa', 35000.00, 'https://example.com/food/tea.jpg'
WHERE NOT EXISTS (
    SELECT 1 FROM food f WHERE f.name = 'Tra Dao Cam Sa'
);

INSERT INTO food (name, price, image_url)
SELECT 'Combo Family', 159000.00, 'https://example.com/food/family-combo.jpg'
WHERE NOT EXISTS (
    SELECT 1 FROM food f WHERE f.name = 'Combo Family'
);

INSERT INTO users (
  role_id, full_name, email, password, phone, is_active, email_verified, last_login, points, created_at
)
SELECT r.id, 'Nhan Vien Demo', 'staff@demo.local', '{noop}Demo@12345', '0900000002', TRUE, TRUE, NOW(), 0, NOW()
FROM roles r
WHERE r.name = 'STAFF'
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  full_name = VALUES(full_name),
  password = VALUES(password),
  is_active = VALUES(is_active),
  email_verified = VALUES(email_verified),
  last_login = VALUES(last_login);

INSERT INTO users (
  role_id, full_name, email, password, phone, is_active, email_verified, last_login, points, created_at
)
SELECT r.id, 'Khach Hang 01', 'customer1@demo.local', '{noop}Demo@12345', '0900000003', TRUE, TRUE, NOW(), 120, NOW()
FROM roles r
WHERE r.name = 'CUSTOMER'
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  full_name = VALUES(full_name),
  password = VALUES(password),
  phone = VALUES(phone),
  is_active = VALUES(is_active),
  email_verified = VALUES(email_verified),
  points = VALUES(points),
  last_login = VALUES(last_login);

INSERT INTO users (
  role_id, full_name, email, password, phone, is_active, email_verified, last_login, points, created_at
)
SELECT r.id, 'Khach Hang 02', 'customer2@demo.local', '{noop}Demo@12345', '0900000004', TRUE, FALSE, NULL, 20, NOW()
FROM roles r
WHERE r.name = 'CUSTOMER'
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  full_name = VALUES(full_name),
  password = VALUES(password),
  phone = VALUES(phone),
  is_active = VALUES(is_active),
  email_verified = VALUES(email_verified),
  points = VALUES(points);

INSERT INTO bookings (user_id, total_amount, status, created_at)
SELECT u.id, 223000.00, 'PAID', '2026-04-10 10:00:00'
FROM users u
WHERE u.email = 'customer1@demo.local'
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.user_id = u.id
      AND b.created_at = '2026-04-10 10:00:00'
  );

INSERT INTO bookings (user_id, total_amount, status, created_at)
SELECT u.id, 124000.00, 'PENDING', '2026-04-10 15:30:00'
FROM users u
WHERE u.email = 'customer2@demo.local'
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.user_id = u.id
      AND b.created_at = '2026-04-10 15:30:00'
  );

INSERT INTO tickets (booking_id, price, status, seats_id, showtimes_id)
SELECT b.id, 89000.00, 'BOOKED', s.id, st.id
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN showtimes st ON st.start_time = '2026-04-12 19:00:00'
JOIN seats s ON s.room_id = st.room_id AND s.row_char = 'A' AND s.number = 1
WHERE u.email = 'customer1@demo.local'
  AND b.created_at = '2026-04-10 10:00:00'
ON DUPLICATE KEY UPDATE
  booking_id = VALUES(booking_id),
  price = VALUES(price),
  status = VALUES(status);

INSERT INTO tickets (booking_id, price, status, seats_id, showtimes_id)
SELECT b.id, 134000.00, 'BOOKED', s.id, st.id
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN showtimes st ON st.start_time = '2026-04-12 21:15:00'
JOIN seats s ON s.room_id = st.room_id AND s.row_char = 'A' AND s.number = 3
WHERE u.email = 'customer1@demo.local'
  AND b.created_at = '2026-04-10 10:00:00'
ON DUPLICATE KEY UPDATE
  booking_id = VALUES(booking_id),
  price = VALUES(price),
  status = VALUES(status);

INSERT INTO tickets (booking_id, price, status, seats_id, showtimes_id)
SELECT b.id, 124000.00, 'BOOKED', s.id, st.id
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN showtimes st ON st.start_time = '2026-04-13 18:30:00'
JOIN seats s ON s.room_id = st.room_id AND s.row_char = 'C' AND s.number = 3
WHERE u.email = 'customer2@demo.local'
  AND b.created_at = '2026-04-10 15:30:00'
ON DUPLICATE KEY UPDATE
  booking_id = VALUES(booking_id),
  price = VALUES(price),
  status = VALUES(status);

INSERT INTO booking_food (booking_id, food_id, quantity, sub_total)
SELECT b.id, f.id, 1, 89000.00
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN food f ON f.name = 'Bap Nuoc Combo'
WHERE u.email = 'customer1@demo.local'
  AND b.created_at = '2026-04-10 10:00:00'
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity),
  sub_total = VALUES(sub_total);

INSERT INTO booking_food (booking_id, food_id, quantity, sub_total)
SELECT b.id, f.id, 1, 35000.00
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN food f ON f.name = 'Tra Dao Cam Sa'
WHERE u.email = 'customer2@demo.local'
  AND b.created_at = '2026-04-10 15:30:00'
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity),
  sub_total = VALUES(sub_total);

INSERT INTO payments (booking_id, method, amount, transaction_id, status, created_at, paid_at)
SELECT b.id, 'MOMO', 223000.00, 'TXN-DEMO-0001', 'SUCCESS', '2026-04-10 10:05:00', '2026-04-10 10:06:00'
FROM bookings b
JOIN users u ON u.id = b.user_id
WHERE u.email = 'customer1@demo.local'
  AND b.created_at = '2026-04-10 10:00:00'
ON DUPLICATE KEY UPDATE
  amount = VALUES(amount),
  status = VALUES(status),
  paid_at = VALUES(paid_at);

INSERT INTO payments (booking_id, method, amount, transaction_id, status, created_at, paid_at)
SELECT b.id, 'CASH', 124000.00, 'TXN-DEMO-0002', 'PENDING', '2026-04-10 15:32:00', NULL
FROM bookings b
JOIN users u ON u.id = b.user_id
WHERE u.email = 'customer2@demo.local'
  AND b.created_at = '2026-04-10 15:30:00'
ON DUPLICATE KEY UPDATE
  amount = VALUES(amount),
  status = VALUES(status),
  paid_at = VALUES(paid_at);
