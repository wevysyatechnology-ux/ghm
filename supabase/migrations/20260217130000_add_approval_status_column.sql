/*
  # Add approval_status column to profiles table
  
  Adds the missing approval_status column which is required for the signup workflow.
  New members will have pending approval status and wait for admin review.
*/

-- Add approval_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN approval_status text DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    
    RAISE NOTICE 'Added approval_status column to profiles table';
  END IF;
END $$;

-- Create index for faster queries on approval status
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);

