-- Migration: add_posts_user_fk.sql
-- Purpose: Add foreign key constraint from posts.user_id -> profiles.id
-- Behavior: ON DELETE CASCADE so when a profile is removed, their posts are removed too.
-- NOTE: This migration will first remove orphaned posts (no matching profile) to allow the FK to be created.

BEGIN;

-- 1) Inspect orphaned posts (for operator review)
-- SELECT p.id, p.user_id FROM posts p LEFT JOIN profiles pr ON p.user_id = pr.id WHERE p.user_id IS NOT NULL AND pr.id IS NULL;

-- 2) Remove orphaned posts (no matching profile). This ensures the FK can be created.
DELETE FROM posts
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM profiles);

-- 3) Add FK constraint with CASCADE delete when a profile is removed.
ALTER TABLE posts
  ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE
  NOT VALID;

-- Validate constraint (safer for large datasets)
ALTER TABLE posts VALIDATE CONSTRAINT posts_user_id_fkey;

COMMIT;

-- 4) Add an index to speed joins (if not present)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- After running: refresh/deploy Supabase REST (PostgREST) schema cache so joins like select('*, profiles(*)') work.
