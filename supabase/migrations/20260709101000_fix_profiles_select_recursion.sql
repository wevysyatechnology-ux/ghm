/*
  # Emergency fix: infinite recursion re-introduced on profiles SELECT

  The 20260709100000 migration recreated "Admins can view all profiles"
  using a raw self-referential subquery on profiles, which regressed a
  recursion bug that was already fixed once before (see
  20260223142329_fix_infinite_recursion_profiles_policy_v2.sql). This
  broke every authenticated SELECT on profiles in production.

  Fix: use the existing public.get_user_role() SECURITY DEFINER helper,
  same as the original fix, with 'collaborator' added to the allowed list.
*/

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin', 'collaborator')
  );
