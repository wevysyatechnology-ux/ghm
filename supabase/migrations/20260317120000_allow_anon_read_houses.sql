/*
  # Allow Anonymous (Unauthenticated) Read Access on Houses Table

  ## Problem
  Migration 20260315144917 dropped the "Anyone can view houses" policy which
  allowed anon users to read houses. Only "All authenticated users can view houses"
  remained, so the signup page dropdown showed nothing (user is not logged in yet).

  ## Fix
  Drop the authenticated-only SELECT policy and recreate it covering both
  anon and authenticated roles so the signup house dropdown is populated.
*/

DROP POLICY IF EXISTS "All authenticated users can view houses" ON public.houses;
DROP POLICY IF EXISTS "Anyone can view houses" ON public.houses;
DROP POLICY IF EXISTS "Everyone can view houses" ON public.houses;
DROP POLICY IF EXISTS "Authenticated users can view houses" ON public.houses;

CREATE POLICY "Anyone can view houses"
  ON public.houses
  FOR SELECT
  TO anon, authenticated
  USING (true);
