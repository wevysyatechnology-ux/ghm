-- ============================================================
-- Allow Collaborator to Edit Houses, Locations, and Members
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- houses: add 'collaborator' to INSERT / UPDATE / DELETE
DROP POLICY IF EXISTS "Admins can insert houses" ON public.houses;
CREATE POLICY "Admins can insert houses"
  ON public.houses FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text]));

DROP POLICY IF EXISTS "Admins can update houses" ON public.houses;
CREATE POLICY "Admins can update houses"
  ON public.houses FOR UPDATE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text]))
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text]));

DROP POLICY IF EXISTS "Admins can delete houses" ON public.houses;
CREATE POLICY "Admins can delete houses"
  ON public.houses FOR DELETE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text]));

-- countries / states / zones: add 'collaborator' to the FOR ALL policy
DROP POLICY IF EXISTS "Admins can manage countries" ON public.countries;
CREATE POLICY "Admins can manage countries"
  ON public.countries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'collaborator')
    )
  );

DROP POLICY IF EXISTS "Admins can manage states" ON public.states;
CREATE POLICY "Admins can manage states"
  ON public.states FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'collaborator')
    )
  );

DROP POLICY IF EXISTS "Admins can manage zones" ON public.zones;
CREATE POLICY "Admins can manage zones"
  ON public.zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'collaborator')
    )
  );

-- profiles (members): add 'collaborator' to INSERT / UPDATE / DELETE
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;
CREATE POLICY "Users and admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = (select auth.uid())
    OR get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text])
  )
  WITH CHECK (
    auth_user_id = (select auth.uid())
    OR get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text])
  );

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text]));

DROP POLICY IF EXISTS "Admins can insert member profiles" ON public.profiles;
CREATE POLICY "Admins can insert member profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'collaborator')
    )
  );
