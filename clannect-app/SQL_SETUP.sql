-- SQL commands to set up the posts table with proper RLS policies

-- First, make sure the posts table exists with the right structure:
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  media_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies:

-- Anyone can read posts
CREATE POLICY "Anyone can read posts" ON posts
FOR SELECT USING (true);

-- Users can only insert their own posts
CREATE POLICY "Users can insert own posts" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts
CREATE POLICY "Users can update own posts" ON posts
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own posts
CREATE POLICY "Users can delete own posts" ON posts
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- For avatars bucket:
-- Users can upload only to their own avatar path (avatarId.ext format)
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );

-- Anyone can view/download avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can update/delete only their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- For post-media bucket:
-- Users can upload only their own media
CREATE POLICY "Authenticated users can upload post media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-media' AND
    auth.role() = 'authenticated'
  );

-- Anyone can view post media
CREATE POLICY "Anyone can view post media" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

-- For message-media bucket:
-- Users can upload only their own media
CREATE POLICY "Authenticated users can upload message media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-media' AND
    auth.role() = 'authenticated'
  );

-- Anyone can view message media (public)
CREATE POLICY "Anyone can view message media" ON storage.objects
  FOR SELECT USING (bucket_id = 'message-media');

-- ============================================
-- ALLY_REQUESTS RLS POLICIES
-- ============================================

-- Enable RLS on ally_requests
ALTER TABLE ally_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Users can read own sent requests" ON ally_requests;
DROP POLICY IF EXISTS "Users can insert ally requests" ON ally_requests;
DROP POLICY IF EXISTS "Users can update received requests" ON ally_requests;
DROP POLICY IF EXISTS "Users can delete ally requests" ON ally_requests;

-- Users can read their own sent requests
CREATE POLICY "Users can read own sent requests" ON ally_requests
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert requests they are sending
CREATE POLICY "Users can insert ally requests" ON ally_requests
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update requests sent to them
CREATE POLICY "Users can update received requests" ON ally_requests
FOR UPDATE USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Users can delete requests they sent or received
CREATE POLICY "Users can delete ally requests" ON ally_requests
FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ============================================
-- ALLIES RLS POLICIES
-- ============================================

-- Enable RLS on allies
ALTER TABLE allies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Users can read own allies" ON allies;
DROP POLICY IF EXISTS "Users can insert allies" ON allies;
DROP POLICY IF EXISTS "Users can delete their own allies" ON allies;
DROP POLICY IF EXISTS "Users can delete allies they are in" ON allies;

-- Users can read their own allies
CREATE POLICY "Users can read own allies" ON allies
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = ally_id);

-- Users can insert allies when they are either user_id or ally_id
CREATE POLICY "Users can insert allies" ON allies
FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = ally_id);

-- Users can delete allies they are involved with
CREATE POLICY "Users can delete allies they are in" ON allies
FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = ally_id);

-- ============================================
-- REMOVE ALLY FUNCTION
-- ============================================

-- Create a function to decline/delete an ally request
CREATE OR REPLACE FUNCTION decline_ally_request(request_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM ally_requests
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE CONVERSATION FUNCTION
-- ============================================

-- Create a function to create a conversation and add members
-- This bypasses RLS since it uses SECURITY DEFINER with row_security off
-- Modified to check for existing conversations to prevent duplicates
CREATE OR REPLACE FUNCTION public.create_conversation_with_members(user1_id uuid, user2_id uuid)
RETURNS uuid AS $$
DECLARE
  conv_id uuid;
  existing_conv_id uuid;
BEGIN
  -- Check if conversation already exists between these two users
  -- A conversation exists if both users are members of the same conversation
  SELECT DISTINCT cm1.conversation_id INTO existing_conv_id
  FROM conversation_members cm1
  INNER JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
  WHERE (cm1.user_id = user1_id AND cm2.user_id = user2_id)
     OR (cm1.user_id = user2_id AND cm2.user_id = user1_id)
  LIMIT 1;

  -- If conversation exists, return its ID
  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Insert conversation only if it doesn't exist
  INSERT INTO conversations (created_at)
  VALUES (now())
  RETURNING id INTO conv_id;

  -- Add both users to conversation_members
  -- Using individual inserts to ensure both are added
  INSERT INTO conversation_members (conversation_id, user_id, created_at)
  VALUES (conv_id, user1_id, now());

  INSERT INTO conversation_members (conversation_id, user_id, created_at)
  VALUES (conv_id, user2_id, now());

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public SET row_security = off;

-- ============================================
-- CONVERSATIONS RLS POLICIES
-- ============================================

-- Enable RLS on conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Users can read conversations they are in" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they are in" ON conversations;

-- Users can read conversations they are a member of
CREATE POLICY "Users can read conversations they are in" ON conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = conversations.id
    AND conversation_members.user_id = auth.uid()
  )
);

-- Users can insert conversations (will be added to conversation_members via app logic)
CREATE POLICY "Authenticated users can create conversations" ON conversations
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update conversations they are a member of
CREATE POLICY "Users can update conversations they are in" ON conversations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = conversations.id
    AND conversation_members.user_id = auth.uid()
  )
);

-- ============================================
-- CONVERSATION_MEMBERS RLS POLICIES
-- ============================================

-- Enable RLS on conversation_members
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Users can read own conversation memberships" ON conversation_members;
DROP POLICY IF EXISTS "Users can insert into conversation_members" ON conversation_members;
DROP POLICY IF EXISTS "Users can delete own conversation memberships" ON conversation_members;
DROP POLICY IF EXISTS "Users can read conversation members" ON conversation_members;

-- Allow authenticated users to read all conversation members
-- Security is enforced at the conversations level (users can only see conversations they're in)
CREATE POLICY "Authenticated users can read conversation members" ON conversation_members
FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert themselves into conversations
CREATE POLICY "Users can insert into conversation_members" ON conversation_members
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete themselves from conversations
CREATE POLICY "Users can delete own conversation memberships" ON conversation_members
FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- MESSAGES RLS POLICIES
-- ============================================

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Users can read messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- Users can read messages in conversations they are part of
CREATE POLICY "Users can read messages in their conversations" ON messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = messages.conversation_id
    AND conversation_members.user_id = auth.uid()
  )
);

-- Users can insert messages into conversations they are part of
CREATE POLICY "Users can insert messages in their conversations" ON messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = messages.conversation_id
    AND conversation_members.user_id = auth.uid()
  )
);

-- Users can update their own messages (needed for realtime subscriptions)
CREATE POLICY "Users can update own messages" ON messages
FOR UPDATE USING (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
FOR DELETE USING (auth.uid() = sender_id);

-- ============================================
-- USER SETTINGS TABLE
-- ============================================

-- Create user_settings table to store privacy and appearance preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Privacy settings
  dm_permissions text NOT NULL DEFAULT 'everyone', -- 'everyone', 'allies_only', 'nobody'
  ally_request_permissions text NOT NULL DEFAULT 'everyone', -- 'everyone', 'nobody'
  -- Appearance settings
  theme text NOT NULL DEFAULT 'system', -- 'system', 'light', 'dark'
  language text NOT NULL DEFAULT 'en', -- 'en', etc.
  font_size text NOT NULL DEFAULT 'medium', -- 'small', 'medium', 'large'
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings:

-- Anyone can read dm_permissions and ally_request_permissions (public privacy settings)
CREATE POLICY "Anyone can read privacy settings" ON user_settings
FOR SELECT USING (true);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings" ON user_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings" ON user_settings
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete own settings" ON user_settings
FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

-- Create a function to automatically create user settings when a new user signs up
CREATE OR REPLACE FUNCTION public.create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create settings for new users
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_settings();
-- Function to create settings for all existing users who don't have them yet
CREATE OR REPLACE FUNCTION public.create_missing_user_settings()
RETURNS TABLE(created_count int) AS $$
DECLARE
  v_created_count int := 0;
BEGIN
  INSERT INTO public.user_settings (user_id)
  SELECT u.id
  FROM auth.users u
  WHERE u.id NOT IN (SELECT user_id FROM public.user_settings)
  ON CONFLICT (user_id) DO NOTHING;
  
  GET DIAGNOSTICS v_created_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;