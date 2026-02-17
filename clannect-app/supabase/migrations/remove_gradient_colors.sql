-- Remove gradient_color column from profiles table and associated functions/triggers

-- Drop the trigger first
DROP TRIGGER IF EXISTS set_gradient_color_trigger ON profiles;

-- Drop the function that sets gradient color
DROP FUNCTION IF EXISTS set_gradient_color();

-- Drop the function that generates gradient color
DROP FUNCTION IF EXISTS get_gradient_for_user(uuid);

-- Remove the gradient_color column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS gradient_color;
