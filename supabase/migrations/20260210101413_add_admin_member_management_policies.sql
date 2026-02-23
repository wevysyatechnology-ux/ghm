/*
  # Add Admin Member Management Policies

  1. Changes
    - Add INSERT policy for admins to create member profiles
    - Add UPDATE policy for admins to edit any member profile
    - Add DELETE policy for admins to remove member profiles
  
  2. Security
    - Only super_admin and global_admin roles can manage all members
    - Existing user policies remain intact for users to manage their own profiles
*/

-- Allow admins to insert member profiles
CREATE POLICY "Admins can insert member profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

-- Allow admins to update any member profile
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

-- Allow admins to delete member profiles
CREATE POLICY "Admins can delete member profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );