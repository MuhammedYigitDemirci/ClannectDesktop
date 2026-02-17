-- Add replied_to_message_id column to messages table
ALTER TABLE messages ADD COLUMN replied_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Create an index for faster queries
CREATE INDEX idx_messages_replied_to ON messages(replied_to_message_id);
