-- Fix: Allow anonymous (unauthenticated) users to read houses
-- This is required so the house dropdown is populated on the signup page.

-- Drop any existing houses SELECT policies that only cover authenticated users
DROP POLICY IF EXISTS "Authenticated users can view houses" ON houses;
DROP POLICY IF EXISTS "Everyone can view houses" ON houses;

-- Re-create the SELECT policy allowing BOTH anon and authenticated roles
CREATE POLICY "Everyone can view houses"
  ON houses FOR SELECT
  TO anon, authenticated
  USING (true);
