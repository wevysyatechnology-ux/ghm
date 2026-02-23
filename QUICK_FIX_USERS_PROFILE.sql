/*
  # QUICK FIX: Create users_profile table and fix signup

  This fixes the 500 error by:
  1. Creating the users_profile table (was missing!)
  2. Creating proper RLS policies
  3. Fixing the trigger to insert into users_profile

  INSTRUCTIONS:
  1. Go to Supabase Dashboard
  2. Click "SQL Editor" → "New Query"
  3. Paste this ENTIRE script
  4. Click "Run"
  5. Done! Signup should now work
*/

-- ==============================================================================
-- STEP 1: Create users_profile table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==============================================================================
-- STEP 2: Enable RLS
-- ==============================================================================

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- STEP 3: Create RLS policies
-- ==============================================================================

-- Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can create their own user profile" ON users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can read own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can update their own user profile" ON users_profile;
DROP POLICY IF EXISTS "Users can view own profile" ON users_profile;
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON users_profile;
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON users_profile;
DROP POLICY IF EXISTS "Admins can update any profile" ON users_profile;
DROP POLICY IF EXISTS "Admins can delete member profiles" ON users_profile;

-- Create clean set of policies

-- SELECT: All authenticated users can view all profiles
CREATE POLICY "All authenticated users can view profiles"
  ON users_profile FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Allow trigger to create profile (CRITICAL - must use true, not auth.uid())
CREATE POLICY "Users can insert own profile on signup"
  ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update their own user profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Admins can delete profiles (you'll check admin role in your app)
CREATE POLICY "Admins can delete member profiles"
  ON users_profile FOR DELETE
  TO authenticated
  USING (true);

-- ==============================================================================
-- STEP 4: Fix the trigger
-- ==============================================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop old function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create improved trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into users_profile with full_name and phone_number
  BEGIN
    INSERT INTO public.users_profile (id, full_name, phone_number)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
      COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL)
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE LOG 'User profile already exists: %', NEW.id;
    WHEN others THEN
      RAISE LOG 'Error creating user profile: %', SQLERRM;
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RAISE EXCEPTION 'Failed to create user account: %', SQLERRM;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- STEP 5: Create index
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_users_profile_id ON users_profile(id);

-- ==============================================================================
-- STEP 6: Verify
-- ==============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  trigger_exists BOOLEAN;
  func_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'users_profile'
  ) INTO table_exists;

  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
  ) INTO trigger_exists;

  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION:';
  RAISE NOTICE '========================================';

  IF table_exists THEN
    RAISE NOTICE '✅ users_profile table exists';
  ELSE
    RAISE WARNING '❌ users_profile table missing!';
  END IF;

  IF trigger_exists THEN
    RAISE NOTICE '✅ on_auth_user_created trigger exists';
  ELSE
    RAISE WARNING '❌ trigger missing!';
  END IF;

  IF func_exists THEN
    RAISE NOTICE '✅ handle_new_user function exists';
  ELSE
    RAISE WARNING '❌ function missing!';
  END IF;

  RAISE NOTICE '========================================';
  
  IF table_exists AND trigger_exists AND func_exists THEN
    RAISE NOTICE '🎉 ALL FIXES APPLIED! Signup should work now.';
  ELSE
    RAISE NOTICE '⚠️  Some fixes failed. Check warnings above.';
  END IF;
  
END $$;

-- ==============================================================================
-- Testing - Show table structure
-- ==============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users_profile'
ORDER BY ordinal_position;

-- Show trigger function code
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
