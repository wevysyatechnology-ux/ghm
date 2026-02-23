/*
  # Create approve_member function

  1. Function Purpose
    - Allows super_admin to approve or reject member signups
    - Updates approval_status in both profiles and users_profile tables
    - Only super_admin can execute this function

  2. Changes
    - Create approve_member function with member_id and new_status parameters
    - Function updates approval_status in profiles table
*/

CREATE OR REPLACE FUNCTION approve_member(
  member_id uuid,
  new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role text;
BEGIN
  SELECT role INTO admin_role
  FROM profiles
  WHERE id = auth.uid();

  IF admin_role IS NULL OR admin_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can approve members';
  END IF;

  IF new_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected';
  END IF;

  UPDATE profiles
  SET approval_status = new_status,
      updated_at = now()
  WHERE id = member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
END;
$$;
