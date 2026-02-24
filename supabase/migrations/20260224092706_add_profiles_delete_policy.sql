/*
  # Add DELETE policy for profiles table

  ## Problem
  There was no DELETE policy on the profiles table, causing member deletion to silently fail
  due to RLS blocking all delete operations.

  ## Changes
  - Added DELETE policy allowing super_admin and global_admin to delete any profile
  - Members cannot delete their own profile (only admins can delete)
*/

CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::text, 'global_admin'::text])
  );
