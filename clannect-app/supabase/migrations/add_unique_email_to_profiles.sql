-- Create a case-insensitive unique index on profiles.email to enforce email uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'idx_profiles_email_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_profiles_email_unique ON profiles ((lower(email)))';
  END IF;
END$$;
