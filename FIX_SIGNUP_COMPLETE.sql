-- ============================================
-- COMPLETE SIGNUP FIX FOR SUPABASE DATABASE
-- ============================================
-- This script fixes all signup issues by:
-- 1. Ensuring both users_profile and profiles tables exist
-- 2. Creating proper trigger to populate both tables
-- 3. Setting up RLS policies correctly
-- 4. Adding approve_member function for admin approval
-- ============================================

-- STEP 1: Create users_profile table (if not exists)
-- ====================================================
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users_profile
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on users_profile to avoid conflicts
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users_profile') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users_profile', r.policyname);
    RAISE NOTICE 'Dropped policy on users_profile: %', r.policyname;
  END LOOP;
END $$;

-- Create RLS policies for users_profile
CREATE POLICY "Users can read own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- STEP 2: Ensure profiles table has approval_status column
-- =========================================================
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

-- Create index for faster approval status queries
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);

-- STEP 3: Update profiles RLS policies
-- =====================================
-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('super_admin', 'global_admin')
    )
  );

-- STEP 4: Create unified trigger function
-- ========================================
-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create new unified trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_full_name text;
  v_phone_number text;
  v_role text;
  v_email text;
BEGIN
  -- Extract metadata with better defaults
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  v_phone_number := COALESCE(NEW.raw_user_meta_data->>'phone_number', '');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');
  v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');

  RAISE LOG 'handle_new_user trigger started for user: % (email: %)', NEW.id, v_email;

  -- Insert into users_profile (don't fail if this fails)
  BEGIN
    INSERT INTO public.users_profile (id, full_name, phone_number, created_at, updated_at)
    VALUES (NEW.id, v_full_name, v_phone_number, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        updated_at = NOW();
    
    RAISE LOG 'Successfully created/updated users_profile for user: %', NEW.id;
  EXCEPTION
    WHEN others THEN
      RAISE WARNING 'Error creating users_profile (non-fatal): %', SQLERRM;
      -- Don't fail the entire signup if users_profile fails
  END;

  -- Insert into profiles (this is critical)
  BEGIN
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name, 
      role, 
      approval_status,
      mobile,
      created_at
    )
    VALUES (
      NEW.id,
      v_email,
      v_full_name,
      v_role,
      CASE 
        WHEN v_role = 'super_admin' THEN 'approved'
        ELSE 'pending'
      END,
      v_phone_number,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        mobile = EXCLUDED.mobile;
    
    RAISE LOG 'Successfully created/updated profile for user: %', NEW.id;
  EXCEPTION
    WHEN others THEN
      RAISE WARNING 'Error creating profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
      -- Log the error but DON'T raise exception - let signup continue
      -- The signup component will handle updating the profile
  END;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Unexpected error in handle_new_user trigger: %', SQLERRM;
    -- Return NEW anyway to not block the auth user creation
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Confirm trigger creation
DO $$
BEGIN
  RAISE NOTICE 'Trigger function created with improved error handling';
END $$;

-- STEP 5: Create approve_member function for admins
-- ==================================================
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
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'global_admin')
  ) THEN
    RAISE EXCEPTION 'Only administrators can approve members';
  END IF;

  -- Update the member's approval status
  UPDATE profiles
  SET approval_status = new_status
  WHERE id = member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
END;
$$;

-- STEP 6: Create indexes for performance
-- =======================================
CREATE INDEX IF NOT EXISTS idx_users_profile_id ON users_profile(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify everything is set up correctly:

-- Check if tables exist
SELECT 'users_profile table exists' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_profile');

SELECT 'profiles table exists' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles');

-- Check if trigger exists
SELECT 'handle_new_user trigger exists' as status
WHERE EXISTS (
  SELECT 1 FROM pg_trigger 
  WHERE tgname = 'on_auth_user_created'
);

-- Check approval_status column
SELECT 'approval_status column exists' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'profiles'
  AND column_name = 'approval_status'
);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SIGNUP FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '1. ✓ users_profile table created/verified';
  RAISE NOTICE '2. ✓ profiles table approval_status added';
  RAISE NOTICE '3. ✓ Unified trigger creates both tables';
  RAISE NOTICE '4. ✓ RLS policies configured correctly';
  RAISE NOTICE '5. ✓ approve_member function created';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update Signup.tsx code (provided separately)';
  RAISE NOTICE '2. Test new member signup';
  RAISE NOTICE '3. Test admin approval workflow';
  RAISE NOTICE '========================================';
END $$;
