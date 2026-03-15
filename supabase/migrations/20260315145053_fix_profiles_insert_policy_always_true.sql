/*
  # Fix Profiles INSERT Policy (Always True)

  ## Summary
  The profiles table had two INSERT policies that effectively bypassed RLS for
  anyone (WITH CHECK = true). This replaces them with a single, proper policy
  that only allows users to insert their own profile (auth_user_id must match
  the authenticated user's uid).

  This is safe because the trigger that creates profiles on signup runs as
  SECURITY DEFINER and bypasses RLS entirely.
*/

DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_signup" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = (select auth.uid()));
