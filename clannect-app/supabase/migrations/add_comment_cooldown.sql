-- Add comment cooldown tracking to profiles
-- Similar to post cooldown, but for comments (5 per 20 minutes)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS comment_cooldown_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_cooldown_reset_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance when checking cooldown
CREATE INDEX IF NOT EXISTS idx_profiles_comment_cooldown ON profiles(comment_cooldown_reset_at);
