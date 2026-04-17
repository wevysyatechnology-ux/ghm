/*
  # Allow collaborators to read all profiles

  ## Changes
  - Drops the existing "Users and admins can view profiles" SELECT policy on the profiles table
  - Re-creates it to also include users with the 'collaborator' role, giving them full read access to all profiles

  ## Reason
  Collaborators are a view-only role and need to see all member data across the system.
*/

DROP POLICY IF EXISTS "Users and admins can view profiles" ON profiles;

CREATE POLICY "Users and admins can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth_user_id = ( SELECT auth.uid() AS uid))
    OR ((house_id IS NOT NULL) AND (house_id = get_my_house_id()))
    OR (get_user_role(( SELECT auth.uid() AS uid)) = ANY (
      ARRAY['super_admin'::text, 'global_admin'::text, 'zone_admin'::text, 'house_admin'::text, 'collaborator'::text]
    ))
  );
