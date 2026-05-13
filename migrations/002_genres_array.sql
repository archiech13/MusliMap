-- Migrate genre (text) → genres (text[]) on profiles and gigs.
-- The old `genre` column is kept for now and can be dropped once verified.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}';

UPDATE profiles
  SET genres = ARRAY[genre]
  WHERE genre IS NOT NULL AND genre != '' AND genres = '{}';

ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}';

UPDATE gigs
  SET genres = ARRAY[genre]
  WHERE genre IS NOT NULL AND genre != '' AND genres = '{}';
