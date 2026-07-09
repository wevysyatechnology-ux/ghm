/*
  # Fix infinite recursion in collaborator location policies

  The previous migration's INSERT policies for countries/states/zones
  queried `profiles` directly inside the policy, which re-triggers RLS
  on profiles and causes "infinite recursion detected in policy".

  Fix: use the existing public.get_user_role() SECURITY DEFINER helper
  (already used by every other admin policy in this schema) instead of
  a raw subquery on profiles.
*/

DROP POLICY IF EXISTS "Collaborators can insert countries" ON countries;
CREATE POLICY "Collaborators can insert countries"
  ON countries FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'collaborator');

DROP POLICY IF EXISTS "Collaborators can insert states" ON states;
CREATE POLICY "Collaborators can insert states"
  ON states FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'collaborator');

DROP POLICY IF EXISTS "Collaborators can insert zones" ON zones;
CREATE POLICY "Collaborators can insert zones"
  ON zones FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'collaborator');
