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
SELECT r.id, 'Admin Demo', 'admin@demo.local', '$2a$10$examplehashedpassword', '0900000001', TRUE, TRUE, NOW(), 0, NOW()
FROM roles r
WHERE r.name = 'ADMIN'
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  full_name = VALUES(full_name),
  password = VALUES(password),
  is_active = VALUES(is_active),
  email_verified = VALUES(email_verified),
  last_login = VALUES(last_login);
