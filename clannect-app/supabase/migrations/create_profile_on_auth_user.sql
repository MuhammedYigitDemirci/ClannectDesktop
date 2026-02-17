-- Create trigger to auto-create profiles for new auth users

-- Function to insert into public.profiles when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert a profiles row for the newly created auth.user
  -- Use the email's local part as a default username (lowercased). Adjust as needed.
  INSERT INTO public.profiles (id, username, email, display_name, created_at)
  VALUES (
    NEW.id,
    lower(split_part(coalesce(NEW.email, ''), '@', 1)),
    NEW.email,
    split_part(coalesce(NEW.email, ''), '@', 1),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to call the function after insert
CREATE TRIGGER trigger_handle_new_auth_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
