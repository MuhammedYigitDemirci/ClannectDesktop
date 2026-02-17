-- Create a function to safely insert profiles (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  user_id UUID,
  user_username TEXT,
  user_email TEXT,
  user_banner_gradient TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, banner_gradient, created_at)
  VALUES (user_id, user_username, user_email, user_banner_gradient, NOW())
  ON CONFLICT (id) DO NOTHING;
END;
$$;
