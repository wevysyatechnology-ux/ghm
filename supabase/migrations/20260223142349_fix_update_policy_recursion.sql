/*
  # Fix infinite recursion in profiles UPDATE policy

  1. Problem
    - "Admins can update any profile" policy also has infinite recursion
    - It queries profiles table to check if user is admin
    
  2. Solution
    - Update the admin UPDATE policy to use the secure function
*/

-- Drop existing admin UPDATE policy
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Recreate admin UPDATE policy using the secure function
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin')
  );
