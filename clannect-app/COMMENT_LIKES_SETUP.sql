-- SQL setup for Comment Likes functionality
-- Run this script to add comment likes table with RLS policies

-- ============================================
-- COMMENT LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can insert own comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can delete own comment likes" ON comment_likes;

-- RLS Policies for comment_likes:

-- Anyone can read comment likes
CREATE POLICY "Anyone can read comment likes" ON comment_likes
FOR SELECT USING (true);

-- Users can insert their own comment likes
CREATE POLICY "Users can insert own comment likes" ON comment_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comment likes
CREATE POLICY "Users can delete own comment likes" ON comment_likes
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON comment_likes(user_id);
CREATE INDEX IF NOT EXISTS comment_likes_created_at_idx ON comment_likes(created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get comment like count
CREATE OR REPLACE FUNCTION public.get_comment_like_count(comment_id uuid)
RETURNS bigint AS $$
BEGIN
  RETURN COALESCE((SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1), 0)::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if current user liked a comment
CREATE OR REPLACE FUNCTION public.has_user_liked_comment(comment_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM comment_likes 
    WHERE comment_likes.comment_id = $1 
    AND comment_likes.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions on comment_likes
GRANT SELECT ON comment_likes TO authenticated;
GRANT INSERT ON comment_likes TO authenticated;
GRANT DELETE ON comment_likes TO authenticated;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.get_comment_like_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_user_liked_comment(uuid) TO authenticated;
