
/*
  # Add service role admin policies on users_profile

  The create-member edge function uses the service role key to update
  users_profile after creating a member. Without an UPDATE policy that
  allows the service role, the update silently fails or is blocked.

  Adds SELECT, INSERT, UPDATE, DELETE policies for the service role.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users_profile' AND schemaname = 'public'
    AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON public.users_profile
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
