-- Add post_id column to messages table for sharing posts
ALTER TABLE messages ADD COLUMN post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

-- Create index for faster queries when fetching shared posts
CREATE INDEX idx_messages_post_id ON messages(post_id);
