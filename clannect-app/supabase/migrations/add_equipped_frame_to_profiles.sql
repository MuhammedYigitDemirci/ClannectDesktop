-- Add equipped_frame column to profiles table
-- This stores the ID of the currently equipped avatar frame (1, 2, 3, etc.)
-- NULL means no frame is equipped

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_frame INTEGER DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN profiles.equipped_frame IS 'The ID of the equipped avatar frame. 1=White, 2=Neon, 3=Crimson. NULL means no frame.';
