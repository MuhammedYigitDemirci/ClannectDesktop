-- Drop the automatic profile creation trigger
-- We now create profiles on-demand in the hub page instead
DROP TRIGGER IF EXISTS trigger_handle_new_auth_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
