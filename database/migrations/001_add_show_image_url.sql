USE theatre_booking;

ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) NULL AFTER genre;
