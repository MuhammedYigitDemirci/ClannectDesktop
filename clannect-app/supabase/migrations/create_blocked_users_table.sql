-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own blocks (who they blocked and who blocked them)
CREATE POLICY "Users can view their own blocks" ON blocked_users
  FOR SELECT USING (
    auth.uid() = blocker_id OR auth.uid() = blocked_id
  );

-- Policy: Users can block others
CREATE POLICY "Users can block others" ON blocked_users
  FOR INSERT WITH CHECK (
    auth.uid() = blocker_id
  );

-- Policy: Users can unblock others they blocked
CREATE POLICY "Users can unblock others" ON blocked_users
  FOR DELETE USING (
    auth.uid() = blocker_id
  );
