/*
  # Add Member Approval System to Your Database

  INSTRUCTIONS:
  1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/editor
  2. Click on "SQL Editor" in the left sidebar
  3. Click "New Query"
  4. Copy and paste this ENTIRE file
  5. Click "Run" button

  This will add the approval system to your database safely.
*/

-- Step 1: Add approval_status column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN approval_status text DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

    RAISE NOTICE '✅ Added approval_status column';
  ELSE
    RAISE NOTICE '⚠️  approval_status column already exists';
  END IF;
END $$;

-- Step 2: Set existing members to approved status
UPDATE profiles
SET approval_status = 'approved'
WHERE approval_status IS NULL OR approval_status = '';

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status
ON profiles(approval_status);

-- Step 4: Update the handle_new_user function to set approval_status for new signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    approval_status = COALESCE(profiles.approval_status, 'pending');

  RETURN NEW;
END;
$$;

-- Step 5: Add policy to allow users to update their profile after signup
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;
CREATE POLICY "Users can insert own profile during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Step 6: Create function for admins to approve/reject members
CREATE OR REPLACE FUNCTION approve_member(
  member_id uuid,
  new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  RAISE NOTICE '✅ Member approval status updated to: %', new_status;
END;
$$;

-- Step 7: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION approve_member(uuid, text) TO authenticated;

-- Final verification
DO $$
DECLARE
  approval_column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approval_status'
  ) INTO approval_column_exists;

  IF approval_column_exists THEN
    RAISE NOTICE '✅ ✅ ✅ Member approval system installed successfully! ✅ ✅ ✅';
  ELSE
    RAISE EXCEPTION '❌ Installation failed - approval_status column not found';
  END IF;
END $$;
