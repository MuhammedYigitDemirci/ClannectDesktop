-- Create followers table
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Prevent duplicate follows
  UNIQUE(user_id, follower_user_id),
  
  -- Prevent self-follows
  CONSTRAINT no_self_follow CHECK (user_id != follower_user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_followers_user_id ON public.followers(user_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower_user_id ON public.followers(follower_user_id);
CREATE INDEX IF NOT EXISTS idx_followers_created_at ON public.followers(created_at);

-- Enable Row Level Security
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view followers (read access for all)
CREATE POLICY "followers_view" ON public.followers
  FOR SELECT
  USING (true);

-- RLS Policy: Users can only insert their own follow relationships
CREATE POLICY "followers_insert" ON public.followers
  FOR INSERT
  WITH CHECK (follower_user_id = auth.uid());

-- RLS Policy: Users can only update their own follow relationships
CREATE POLICY "followers_update" ON public.followers
  FOR UPDATE
  USING (follower_user_id = auth.uid())
  WITH CHECK (follower_user_id = auth.uid());

-- RLS Policy: Users can only delete their own follow relationships
CREATE POLICY "followers_delete" ON public.followers
  FOR DELETE
  USING (follower_user_id = auth.uid());

-- Helper function: Get follower count for a user
CREATE OR REPLACE FUNCTION get_follower_count(user_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM followers
  WHERE followers.user_id = get_follower_count.user_id
$$ LANGUAGE SQL STABLE;

-- Helper function: Check if a user follows another user
CREATE OR REPLACE FUNCTION is_following(user_id UUID, follower_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1
    FROM followers
    WHERE followers.user_id = is_following.user_id
    AND followers.follower_user_id = is_following.follower_user_id
  )
$$ LANGUAGE SQL STABLE;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON public.followers TO authenticated;
GRANT EXECUTE ON FUNCTION get_follower_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_following TO authenticated;

-- View for followers with profile data
CREATE OR REPLACE VIEW followers_with_profiles AS
SELECT 
  f.id,
  f.user_id,
  f.follower_user_id,
  f.created_at,
  p.username,
  p.display_name,
  p.avatar_url
FROM followers f
JOIN profiles p ON f.follower_user_id = p.id;

GRANT SELECT ON followers_with_profiles TO authenticated;

-- View for users with follower counts
CREATE OR REPLACE VIEW profiles_with_follower_counts AS
SELECT 
  p.*,
  COALESCE(COUNT(f.id), 0)::INT as follower_count
FROM profiles p
LEFT JOIN followers f ON p.id = f.user_id
GROUP BY p.id;

GRANT SELECT ON profiles_with_follower_counts TO authenticated;
