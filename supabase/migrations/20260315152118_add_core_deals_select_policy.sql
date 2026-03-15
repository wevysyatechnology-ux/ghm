/*
  # Add SELECT Policy for core_deals Table

  ## Summary
  The core_deals table was missing a SELECT RLS policy, which caused authenticated
  users to receive zero rows when querying it — making the Deals page and dashboard
  count appear empty despite data existing.

  ## Changes
  - Adds a SELECT policy allowing all authenticated users to view deals
*/

CREATE POLICY "Authenticated users can view deals"
  ON public.core_deals FOR SELECT
  TO authenticated
  USING (true);
