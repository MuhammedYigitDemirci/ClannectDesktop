# Username/Password Authentication Setup

This guide explains how to set up the username-based authentication system for Clannect.

## Overview

The system uses:
- **Usernames** for user-facing login/signup
- **Internal emails** stored in the `profiles` table (format: `username_TIMESTAMP@clannect.local`)
- **Supabase Auth** for password security and session management

## Setup Steps

### 1. Create the Profiles Table

Go to your Supabase dashboard and run this SQL in the SQL Editor:

```sql
CREATE TABLE profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);
```

### 2. How It Works

#### Signup Flow:
1. User enters: username + password
2. System generates: `username_TIMESTAMP@clannect.local` email
3. Creates Supabase auth user with generated email
4. Saves username in `profiles` table

#### Login Flow:
1. User enters: username + password
2. System queries `profiles` table for that username
3. Retrieves the internal email from `profiles.email`
4. Authenticates using that email + password with Supabase Auth
5. Redirects to `/dashboard` on success

### 3. Username Requirements

- **Minimum length**: 3 characters
- **Allowed characters**: letters, numbers, underscores
- **Unique**: Each username must be unique across the platform

### 4. Security Notes

- Passwords are hashed by Supabase Auth
- Internal emails are not visible to users
- Row Level Security (RLS) ensures users can only access their own profiles
- The username is case-sensitive

## Troubleshooting

**"Username or password is incorrect"**
- Check that the username exists in the `profiles` table
- Verify the password is correct
- Make sure the `profiles` table is created

**"Username already taken"**
- This means the username is already in use by another user
- Choose a different username

**Profile insert error**
- Ensure the `profiles` table exists
- Check that RLS policies are set up correctly
