-- Track comment post timestamps to prevent cooldown bypass via deletion
-- Stores the timestamps of the last 5 comments posted by each user
-- This allows us to enforce cooldown even if comments are deleted

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_comment_timestamps TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_comment_timestamps ON profiles USING GIN(last_comment_timestamps);
