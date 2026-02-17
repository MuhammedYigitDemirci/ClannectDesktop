# Post Creation Troubleshooting Guide

## The error you're seeing suggests the posts table needs proper setup.

### Steps to fix this:

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run the SQL commands** from `SQL_SETUP.sql` file in this project

Alternatively, follow these steps in the Supabase UI:

### Option 1: Use the SQL Editor (Recommended)
- Go to Supabase Dashboard > SQL Editor
- Create a new query
- Copy the SQL from `SQL_SETUP.sql`
- Execute the query

### Option 2: Manual Setup in Supabase UI

#### 1. Create/Verify the posts table:
Go to Tables and create or verify the "posts" table has:
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `title` (text, required)
- `description` (text, optional)
- `media_url` (text, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### 2. Enable RLS (Row Level Security):
- Go to the "posts" table
- Click "Policies" 
- Enable RLS
- Add these 4 policies:
  1. **SELECT**: Everyone can read - `true`
  2. **INSERT**: Users insert own - `auth.uid() = user_id`
  3. **UPDATE**: Users update own - `auth.uid() = user_id`
  4. **DELETE**: Users delete own - `auth.uid() = user_id`

#### 3. Make sure post-media bucket is public:
- Go to Storage > post-media
- Click "Settings"
- Make sure it's set to "Public"

### After Setup:
- Try creating a post again
- Check the browser console (F12) for any detailed error messages
- Check the Supabase logs for RLS violations

## Expected Behavior:
1. Fill in title and description
2. Optionally upload image/video
3. Click "Post!"
4. Success message appears
5. Redirected to /hub after 2 seconds

## Common Issues:

### "row-level security violation"
- RLS policies not set up correctly
- See steps above to fix

### "User ID mismatch"
- Make sure auth.uid() is properly referenced in policies
- Verify you're logged in

### "Upload failed"
- post-media bucket doesn't exist
- post-media bucket is not public
- Create the bucket and set to public in Storage settings

### "File size too large"
- Check your file size (max 50MB recommended)
