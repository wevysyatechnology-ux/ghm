/*
  # Quick Fix: Add approval_status column to profiles
  
  This script adds the missing approval_status column that's required for signup to work.
  
  RUN IN SUPABASE SQL EDITOR:
  1. Go to your Supabase project dashboard
  2. Click "SQL Editor" on the left panel
  3. Click "New Query"
  4. Paste this entire script
  5. Click "Run"
  6. You should see success messages
*/

-- Step 1: Add approval_status column if it doesn't exist
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
    
    RAISE NOTICE '✅ Added approval_status column to profiles table';
  ELSE
    RAISE NOTICE 'ℹ️  approval_status column already exists';
  END IF;
END $$;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);

-- Step 3: Verify the fix
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name = 'approval_status';

-- If you see a row above with your approval_status column, the fix worked! ✅
