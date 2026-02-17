-- Add flags to track first-time profile setup XP rewards
-- These prevent duplicate XP awards for the same profile edit

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_xp_awarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS banner_xp_awarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS about_me_xp_awarded BOOLEAN DEFAULT FALSE;

-- Create index for performance when checking these flags
CREATE INDEX IF NOT EXISTS idx_profiles_setup_flags ON profiles(avatar_xp_awarded, banner_xp_awarded, about_me_xp_awarded);
