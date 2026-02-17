-- Create user_owned_items table to track purchased items
CREATE TABLE IF NOT EXISTS user_owned_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('frames', 'themes', 'boosts')),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id, item_type)
);

-- Create user_equipped_items table to track currently equipped items
CREATE TABLE IF NOT EXISTS user_equipped_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('frames', 'themes', 'boosts')),
  equipped_item_id INTEGER NOT NULL,
  equipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_owned_items
ALTER TABLE user_owned_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own owned items
CREATE POLICY "Users can view their own owned items" ON user_owned_items
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own owned items
CREATE POLICY "Users can insert their own owned items" ON user_owned_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable RLS on user_equipped_items
ALTER TABLE user_equipped_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own equipped items
CREATE POLICY "Users can view their own equipped items" ON user_equipped_items
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own equipped items
CREATE POLICY "Users can update their own equipped items" ON user_equipped_items
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own equipped items
CREATE POLICY "Users can insert their own equipped items" ON user_equipped_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_owned_items_user_id ON user_owned_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_owned_items_item_type ON user_owned_items(item_type);
CREATE INDEX IF NOT EXISTS idx_user_equipped_items_user_id ON user_equipped_items(user_id);
