-- Rename coins column to cloin
-- "Cloin" is the official currency name in Clannect

ALTER TABLE profiles
RENAME COLUMN coins TO cloin;

-- Rename the index as well
DROP INDEX IF EXISTS idx_profiles_coins;
CREATE INDEX idx_profiles_cloin ON profiles(cloin);
