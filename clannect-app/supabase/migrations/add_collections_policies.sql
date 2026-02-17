-- Enable Row Level Security and add owner-based policies for the `collections` table
-- This migration is safe to run against a DB where the table/policies may already exist.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collections') THEN

    -- Enable RLS
    BEGIN
      EXECUTE 'ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN others THEN
      -- ignore if already enabled or other issue
      RAISE NOTICE 'Could not enable RLS on public.collections or already enabled';
    END;

    -- Allow everyone to SELECT collections
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policy p
      JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
      WHERE c.relname = 'collections' AND p.polname = 'allow_read_collections'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY allow_read_collections
          ON public.collections
          FOR SELECT
          USING (true);
      $policy$;
    END IF;

    -- Allow owners to INSERT with owner_id = auth.uid()
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policy p
      JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
      WHERE c.relname = 'collections' AND p.polname = 'users_can_insert_collections'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY users_can_insert_collections
          ON public.collections
          FOR INSERT
          WITH CHECK (auth.uid() = owner_id);
      $policy$;
    END IF;

    -- Allow owners to UPDATE only their rows
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policy p
      JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
      WHERE c.relname = 'collections' AND p.polname = 'users_can_update_collections'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY users_can_update_collections
          ON public.collections
          FOR UPDATE
          USING (auth.uid() = owner_id)
          WITH CHECK (auth.uid() = owner_id);
      $policy$;
    END IF;

    -- Allow owners to DELETE only their rows / New Feature due to Errors / TS Fix
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policy p
      JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
      WHERE c.relname = 'collections' AND p.polname = 'users_can_delete_collections'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY users_can_delete_collections
          ON public.collections
          FOR DELETE
          USING (auth.uid() = owner_id);
      $policy$;
    END IF;

  ELSE
    RAISE NOTICE 'Table public.collections does not exist; skipping collections policies migration.';
  END IF;
END$$ LANGUAGE plpgsql;
