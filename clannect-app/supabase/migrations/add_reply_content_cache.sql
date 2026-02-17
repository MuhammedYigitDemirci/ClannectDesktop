-- Add columns to cache replied message content
-- This allows showing reply preview even if original message isn't loaded

-- Store the content/text of the replied message
ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_to_content TEXT;

-- Store the media URL if the replied message had media
ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_to_media_url TEXT;

-- Store the post_id if the replied message was a shared post
ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_to_post_id UUID;

-- Store the sender's display name for the replied message
ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_to_sender_name TEXT;
