-- Add username_change_cooldown_expires_at column to profiles table
ALTER TABLE profiles ADD COLUMN username_change_cooldown_expires_at TIMESTAMP NULL;

-- Create index for faster lookups
CREATE INDEX idx_profiles_username_change_cooldown ON profiles(username_change_cooldown_expires_at);
