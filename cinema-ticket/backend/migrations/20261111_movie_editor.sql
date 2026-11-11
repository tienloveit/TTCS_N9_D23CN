-- Existing databases: run once before starting the updated backend.
-- Existing films remain public; new films created by the editor default to draft.
USE cinema;
ALTER TABLE movies
  ADD COLUMN original_title VARCHAR(255) NULL,
  ADD COLUMN cast_names TEXT NULL,
  ADD COLUMN banner_url VARCHAR(500) NULL,
  ADD COLUMN published BOOLEAN NOT NULL DEFAULT TRUE,
  MODIFY COLUMN thumbnail_url VARCHAR(500) NULL,
  MODIFY COLUMN trailer_url VARCHAR(500) NULL;
