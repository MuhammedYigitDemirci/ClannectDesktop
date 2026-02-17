-- Add cooldown_expires_at column to profiles for cleaner cooldown tracking
-- This replaces relying on last_post_time for cooldown calculations

ALTER TABLE profiles
ADD COLUMN cooldown_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster cooldown checks
CREATE INDEX IF NOT EXISTS idx_profiles_cooldown ON profiles(cooldown_expires_at);

-- Update the post cooldown trigger to use the new column
CREATE OR REPLACE FUNCTION check_post_cooldown()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is currently in cooldown
  IF (SELECT cooldown_expires_at FROM profiles WHERE id = NEW.user_id) > NOW() THEN
    RAISE EXCEPTION 'Post cooldown active. Please wait before posting again.';
  END IF;
  
  -- Set cooldown to expire in 1 hour from now
  UPDATE profiles
  SET cooldown_expires_at = NOW() + INTERVAL '1 hour',
      last_post_time = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
