# Fix Account Creation Issue

## Problem
Account creation is failing with the error:
```
Failed to save profile: record "new" has no field "gradient_color"
```

## Root Cause
The Supabase database still has a trigger (`set_gradient_color_trigger`) that tries to set a `gradient_color` field when new profiles are created. This trigger was created by the `add_gradient_colors.sql` migration, but the gradient color system has been removed.

## Solution
You need to manually execute the cleanup migration in your Supabase SQL editor:

### Step 1: Go to Supabase Dashboard
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** (left sidebar)

### Step 2: Run the Cleanup Query
Copy and paste this SQL into a new query in the SQL Editor and execute it:

```sql
-- Remove gradient_color trigger and functions
DROP TRIGGER IF EXISTS set_gradient_color_trigger ON profiles;
DROP FUNCTION IF EXISTS set_gradient_color();
DROP FUNCTION IF EXISTS get_gradient_for_user(uuid);

-- Remove the gradient_color column from profiles if it still exists
ALTER TABLE profiles DROP COLUMN IF EXISTS gradient_color;
```

### Step 3: Verify
After running the query, you should see no errors. Account creation should now work properly.

## File References
- The cleanup migration is defined in: `supabase/migrations/remove_gradient_colors.sql`
- The deprecated migration (now disabled) is: `supabase/migrations/add_gradient_colors.sql`

## Why This Happened
The gradient color system was removed from the application, but the database trigger that was created to automatically set it during profile creation was still active. This caused new profile insertions to fail because they were trying to set a field that no longer existed.
