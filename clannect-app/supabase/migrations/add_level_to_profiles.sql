-- Add level column to profiles table for gamification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Create index on level for performance
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level);

-- Add constraint to ensure level is positive
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS check_level_positive CHECK (level >= 1);
