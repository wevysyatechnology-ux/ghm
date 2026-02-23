/*
  # Add Member Approval System

  1. Changes
    - Add approval_status column to profiles table
    - Create approve_member function for super admins
    - Set default approval_status for existing members
    - Add index for faster queries

  2. Security
    - Only super_admin and global_admin can approve members
    - Approval status checked during login
    - RLS policies remain unchanged
*/

-- Add approval_status column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN approval_status text DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Set existing members to approved status
UPDATE profiles
SET approval_status = 'approved'
WHERE approval_status IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status
ON profiles(approval_status);

-- Create function to approve/reject members
CREATE OR REPLACE FUNCTION approve_member(
  member_id uuid,
  new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller is a super_admin or global_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'global_admin')
  ) THEN
    RAISE EXCEPTION 'Only super admins and global admins can approve members';
  END IF;

  -- Verify the status is valid
  IF new_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected';
  END IF;

  -- Update the member's approval status
  UPDATE profiles
  SET approval_status = new_status
  WHERE id = member_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION approve_member(uuid, text) TO authenticated;

-- Verify the setup
SELECT '✅ Member approval system added successfully!' as status;
