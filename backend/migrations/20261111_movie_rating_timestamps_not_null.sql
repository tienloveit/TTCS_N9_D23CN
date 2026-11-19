-- MySQL 8. Back up the database and stop the backend first.
-- Preserve known timestamps. If one is missing, use the other; when both are
-- unknown, initialize to migration time. Hibernate manages future timestamps.
USE cinema;
UPDATE movie_ratings
SET created_at=COALESCE(updated_at,CURRENT_TIMESTAMP(6))
WHERE created_at IS NULL;
UPDATE movie_ratings SET updated_at=created_at WHERE updated_at IS NULL;
ALTER TABLE movie_ratings
    MODIFY COLUMN created_at DATETIME(6) NOT NULL,
    MODIFY COLUMN updated_at DATETIME(6) NOT NULL;
