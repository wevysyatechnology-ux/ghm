/*
  # Drop conflicting restrictive SELECT policies on core_links and core_i2we

  ## Summary
  core_links and core_i2we tables had multiple SELECT policies.
  Postgres evaluates permissive policies with OR logic, but the older
  user-specific policies were still filtering results to only rows
  where the logged-in user is a participant. Since the Super Admin
  user ID doesn't match any member IDs in the data, no rows were returned.

  ## Changes
  - Drop the old restrictive SELECT policies on core_links
  - Drop the old restrictive SELECT policies on core_i2we
  - Keep the "Authenticated users can view" policies which use USING (true)
*/

DROP POLICY IF EXISTS "Enable read for authenticated users" ON core_links;
DROP POLICY IF EXISTS "Members can read their I2WE meetings" ON core_i2we;
