-- Post Cooldown Enforcement via Database Trigger
-- This prevents spam by enforcing 1-hour cooldown at the database level
-- Uses profile.last_post_time to track cooldown (deletion-proof)

-- Create a function that validates post cooldown
CREATE OR REPLACE FUNCTION check_post_cooldown()
RETURNS TRIGGER AS $$
DECLARE
  last_post_time TIMESTAMP;
  time_since_last_post INTERVAL;
BEGIN
  -- Get the last post time from the user's profile (deletion-proof)
  SELECT profiles.last_post_time INTO last_post_time
  FROM profiles
  WHERE profiles.id = NEW.user_id;
  
  -- If user has posted before, check cooldown
  IF last_post_time IS NOT NULL THEN
    time_since_last_post := NOW() - last_post_time;
    
    -- If less than 1 hour has passed, reject the post
    IF time_since_last_post < INTERVAL '1 hour' THEN
      RAISE EXCEPTION 'Post cooldown active. Please wait before posting again.';
    END IF;
  END IF;
  
  -- Update the profile's last_post_time to NOW() for this new post
  UPDATE profiles
  SET last_post_time = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS enforce_post_cooldown ON posts;

-- Create trigger to enforce cooldown on insert
CREATE TRIGGER enforce_post_cooldown
BEFORE INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION check_post_cooldown();

-- Index to optimize cooldown checks
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);

