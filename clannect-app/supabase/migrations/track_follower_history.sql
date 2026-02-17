-- Add unfollowed_at column to track follower history
-- This allows us to keep records of who followed whom, even after unfollowing
-- The xp_awarded flag ensures XP is only awarded once per unique follower pair

ALTER TABLE followers
ADD COLUMN unfollowed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX idx_followers_history ON followers(user_id, follower_user_id, xp_awarded, unfollowed_at);
