/*
  # QUICK FIX: Auth Signup Error - 500 Internal Server Error
  
  This script fixes the "Database error saving new user" issue from Supabase Auth.
  
  ROOT CAUSE:
  The database trigger that creates user profiles was silently catching errors,
  and wasn't setting the approval_status field.
  
  INSTRUCTIONS:
  1. Go to your Supabase project dashboard
  2. Click "SQL Editor" on the left panel
  3. Click "New Query"
  4. Paste this ENTIRE script
  5. Click "Run"
  6. Wait for success messages (green checkmarks)
*/

-- ==============================================================================
-- STEP 1: Ensure approval_status column exists
-- ==============================================================================

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
    
    RAISE NOTICE '✅ Added approval_status column to profiles';
  ELSE
    RAISE NOTICE 'ℹ️  approval_status column already exists';
  END IF;
END $$;

-- ==============================================================================
-- STEP 2: Fix the auth signup trigger
-- ==============================================================================

-- Drop the old problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop the old function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the NEW improved trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile with all required fields including approval_status
  INSERT INTO public.profiles (id, email, full_name, role, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    'pending'  -- New signups require approval
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Email already exists (shouldn't happen during auth signup)
    RAISE LOG 'Email already exists in profiles: %', NEW.email;
    RETURN NEW;
  WHEN foreign_key_violation THEN
    -- FK issue (shouldn't happen during auth signup)
    RAISE LOG 'FK violation in handle_new_user: %', SQLERRM;
    RETURN NEW;
  WHEN others THEN
    -- Other errors - log and let it propagate to Auth API
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- STEP 3: Verify the fix
-- ==============================================================================

DO $$
DECLARE
  col_exists BOOLEAN;
  func_exists BOOLEAN;
  trigger_exists BOOLEAN;
BEGIN
  -- Check if approval_status column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'approval_status'
  ) INTO col_exists;

  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;

  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
  ) INTO trigger_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '========================================';
  
  IF col_exists THEN
    RAISE NOTICE '✅ approval_status column exists';
  ELSE
    RAISE WARNING '❌ approval_status column missing!';
  END IF;

  IF func_exists THEN
    RAISE NOTICE '✅ handle_new_user function exists';
  ELSE
    RAISE WARNING '❌ handle_new_user function missing!';
  END IF;

  IF trigger_exists THEN
    RAISE NOTICE '✅ on_auth_user_created trigger exists';
  ELSE
    RAISE WARNING '❌ on_auth_user_created trigger missing!';
  END IF;

  RAISE NOTICE '========================================';
  
  IF col_exists AND func_exists AND trigger_exists THEN
    RAISE NOTICE '🎉 ALL FIXES APPLIED! Signup should now work.';
  ELSE
    RAISE NOTICE '⚠️  Some fixes were not applied. Check warnings above.';
  END IF;
  
END $$;

-- ==============================================================================
-- TESTING THE FIX
-- ==============================================================================

-- This query shows your trigger function code (for debugging)
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE proname = 'handle_new_user'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- This shows the trigger configuration
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Show the profiles table structure
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;
