/*
  # Formalize the 'collaborator' role

  'collaborator' was already being used as a profiles.role value in
  production (added ad-hoc outside of any tracked migration), so this
  migration codifies it and grants it a scoped, create-only permission set:

  1. Role value
     - Add 'collaborator' to the profiles_role_check constraint.

  2. View access
     - Collaborators can view all profiles (needed for the Members/Users
       panels, which already render for this role but were silently
       returning no rows due to RLS).

  3. Create-only access
     - Collaborators can INSERT into houses, countries, states, zones.
     - They do NOT get UPDATE/DELETE on these tables — that remains
       super_admin/global_admin only.
     - Member creation goes through the create-member edge function
       (service role), so it is authorized there, not via table RLS.
*/

-- 1. Allow 'collaborator' as a valid role value
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'zone_admin'::text, 'house_admin'::text, 'collaborator'::text, 'member'::text]));

-- 2. Collaborators can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin', 'collaborator')
    )
  );

-- 3. Collaborators can add (insert) houses
DROP POLICY IF EXISTS "Admins can insert houses" ON houses;
CREATE POLICY "Admins can insert houses"
  ON houses FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text]));

-- 4. Collaborators can add (insert) locations: countries, states, zones
DROP POLICY IF EXISTS "Collaborators can insert countries" ON countries;
CREATE POLICY "Collaborators can insert countries"
  ON countries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'collaborator'));

DROP POLICY IF EXISTS "Collaborators can insert states" ON states;
CREATE POLICY "Collaborators can insert states"
  ON states FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'collaborator'));

DROP POLICY IF EXISTS "Collaborators can insert zones" ON zones;
CREATE POLICY "Collaborators can insert zones"
  ON zones FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'collaborator'));
