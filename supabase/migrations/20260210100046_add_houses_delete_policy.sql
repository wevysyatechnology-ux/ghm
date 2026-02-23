/*
  # Add Delete Policy for Houses Table

  1. Changes
    - Add DELETE policy to allow super_admin and global_admin users to delete houses
  
  2. Security
    - Only super_admin and global_admin roles can delete houses
    - Policy checks user role from profiles table
*/

CREATE POLICY "Admins can delete houses"
  ON houses
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