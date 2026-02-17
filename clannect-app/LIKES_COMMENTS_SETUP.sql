-- SQL setup for Post Likes and Comments functionality
-- Run this script to add likes and comments tables with RLS policies

-- ============================================
-- LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on post_likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read likes" ON post_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON post_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON post_likes;

-- RLS Policies for post_likes:

-- Anyone can read likes
CREATE POLICY "Anyone can read likes" ON post_likes
FOR SELECT USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can insert own likes" ON post_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes" ON post_likes
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS post_likes_created_at_idx ON post_likes(created_at DESC);

-- ============================================
-- COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on post_comments
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read comments" ON post_comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;

-- RLS Policies for post_comments:

-- Anyone can read comments
CREATE POLICY "Anyone can read comments" ON post_comments
FOR SELECT USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert comments" ON post_comments
FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON post_comments
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON post_comments
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS post_comments_created_at_idx ON post_comments(created_at DESC);

-- ============================================
-- HELPER FUNCTIONS AND VIEWS
-- ============================================

-- Function to get post stats (like count and comment count)
CREATE OR REPLACE FUNCTION public.get_post_stats(post_id uuid)
RETURNS TABLE(like_count bigint, comment_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*) FROM post_likes WHERE post_id = $1), 0)::bigint as like_count,
    COALESCE((SELECT COUNT(*) FROM post_comments WHERE post_id = $1), 0)::bigint as comment_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if current user liked a post
CREATE OR REPLACE FUNCTION public.has_user_liked_post(post_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM post_likes 
    WHERE post_likes.post_id = $1 
    AND post_likes.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- View for posts with stats
CREATE OR REPLACE VIEW posts_with_stats AS
SELECT 
  p.id,
  p.user_id,
  p.title,
  p.description,
  p.media_url,
  p.created_at,
  p.updated_at,
  COALESCE(COUNT(DISTINCT pl.id), 0)::int as like_count,
  COALESCE(COUNT(DISTINCT pc.id), 0)::int as comment_count
FROM posts p
LEFT JOIN post_likes pl ON p.id = pl.post_id
LEFT JOIN post_comments pc ON p.id = pc.post_id
GROUP BY p.id, p.user_id, p.title, p.description, p.media_url, p.created_at, p.updated_at;

-- View for comments with user profile info
CREATE OR REPLACE VIEW comments_with_profiles AS
SELECT 
  pc.id,
  pc.post_id,
  pc.user_id,
  pc.content,
  pc.created_at,
  pc.updated_at,
  pr.username,
  pr.display_name,
  pr.avatar_url
FROM post_comments pc
LEFT JOIN profiles pr ON pc.user_id = pr.id;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_post_comments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for post_comments updated_at
DROP TRIGGER IF EXISTS update_post_comments_timestamp ON post_comments;
CREATE TRIGGER update_post_comments_timestamp
  BEFORE UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_comments_timestamp();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions on post_likes
GRANT SELECT ON post_likes TO authenticated;
GRANT INSERT ON post_likes TO authenticated;
GRANT DELETE ON post_likes TO authenticated;

-- Grant permissions on post_comments
GRANT SELECT ON post_comments TO authenticated;
GRANT INSERT ON post_comments TO authenticated;
GRANT UPDATE ON post_comments TO authenticated;
GRANT DELETE ON post_comments TO authenticated;

-- Grant permissions on functions and views
GRANT EXECUTE ON FUNCTION public.get_post_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_user_liked_post(uuid) TO authenticated;
GRANT SELECT ON posts_with_stats TO authenticated;
GRANT SELECT ON comments_with_profiles TO authenticated;
