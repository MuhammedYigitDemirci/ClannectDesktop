-- Track which followers have already awarded XP
-- Prevents awarding XP multiple times for the same follower relationship

ALTER TABLE followers
ADD COLUMN IF NOT EXISTS xp_awarded BOOLEAN DEFAULT FALSE;

-- Create index for performance when checking xp_awarded status
CREATE INDEX IF NOT EXISTS idx_followers_xp_awarded ON followers(user_id, xp_awarded);
