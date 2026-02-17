-- Add last_post_time to track post cooldown
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_post_time TIMESTAMP;

-- Create index on last_post_time for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_post_time ON profiles(last_post_time);

-- XP system configuration (for reference)
-- XP Earning:
-- - Avatar Change: 10 XP
-- - Banner Change: 10 XP
-- - About Me: 30 XP
-- - Create Post: 10 XP (1 hour cooldown)
-- - Comment: 3 XP (max 5 comments per 20 minutes)
-- - Per Follower: 5 XP (not yet implemented)

-- Level Requirements:
-- Levels 1-10: 50 XP/level
-- Levels 10-30: 125 XP/level
-- Levels 30-50: 300 XP/level
-- Levels 50-80: 700 XP/level
-- Levels 80-90: 1,500 XP/level
-- Levels 90-100: 2,000 XP/level
