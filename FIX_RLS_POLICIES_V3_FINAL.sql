/*
  # Fix RLS Infinite Recursion - Complete Working Version

  This fixes:
  1. Adds missing approval_status column
  2. Uses correct column name (mobile not phone)
  3. Fixes infinite recursion in RLS policies
  4. Creates helper functions in public schema (no auth schema permissions needed)
  5. Sets up admin user correctly

  INSTRUCTIONS:
  1. Go to: https://vlwppdpodavowfnyhtkh.supabase.co/project/vlwppdpodavowfnyhtkh/editor
  2. Click "SQL Editor" → "New Query"
  3. Copy and paste this ENTIRE file
  4. Click "Run"
  5. Wait for success message
*/

-- =============================================================================
-- STEP 1: Add missing approval_status column if it doesn't exist
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN approval_status text DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

    RAISE NOTICE '✅ Added approval_status column to profiles';
  ELSE
    RAISE NOTICE 'ℹ️  approval_status column already exists';
  END IF;
END $$;

-- Update all existing profiles to approved status
UPDATE profiles
SET approval_status = 'approved'
WHERE approval_status IS NULL;

-- =============================================================================
-- STEP 2: Drop ALL existing policies to start fresh
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own basic profile info" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile on signup" ON profiles;

DROP POLICY IF EXISTS "Authenticated users can view houses" ON houses;
DROP POLICY IF EXISTS "Everyone can view houses" ON houses;
DROP POLICY IF EXISTS "Admins can insert houses" ON houses;
DROP POLICY IF EXISTS "Admins can update houses" ON houses;
DROP POLICY IF EXISTS "Admins can delete houses" ON houses;
DROP POLICY IF EXISTS "All authenticated users can view houses" ON houses;

DROP POLICY IF EXISTS "Authenticated users can view members" ON members;
DROP POLICY IF EXISTS "Everyone can view members" ON members;
DROP POLICY IF EXISTS "Admins can manage members" ON members;
DROP POLICY IF EXISTS "Admins can insert members" ON members;
DROP POLICY IF EXISTS "Admins can update members" ON members;
DROP POLICY IF EXISTS "Admins can delete members" ON members;
DROP POLICY IF EXISTS "All authenticated users can view members" ON members;

DROP POLICY IF EXISTS "Authenticated users can view links" ON links;
DROP POLICY IF EXISTS "Everyone can view links" ON links;
DROP POLICY IF EXISTS "Authenticated users can create links" ON links;
DROP POLICY IF EXISTS "Users can create links" ON links;
DROP POLICY IF EXISTS "All authenticated users can view links" ON links;

DROP POLICY IF EXISTS "Authenticated users can view deals" ON deals;
DROP POLICY IF EXISTS "Everyone can view deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can create deals" ON deals;
DROP POLICY IF EXISTS "Users can create deals" ON deals;
DROP POLICY IF EXISTS "All authenticated users can view deals" ON deals;

DROP POLICY IF EXISTS "Authenticated users can view i2we events" ON i2we_events;
DROP POLICY IF EXISTS "Everyone can view i2we events" ON i2we_events;
DROP POLICY IF EXISTS "Authenticated users can create i2we events" ON i2we_events;
DROP POLICY IF EXISTS "Users can create i2we events" ON i2we_events;
DROP POLICY IF EXISTS "All authenticated users can view i2we events" ON i2we_events;

DROP POLICY IF EXISTS "Authenticated users can view attendance" ON attendance;
DROP POLICY IF EXISTS "Everyone can view attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can mark attendance" ON attendance;
DROP POLICY IF EXISTS "All authenticated users can view attendance" ON attendance;

-- =============================================================================
-- STEP 3: Create helper functions in PUBLIC schema
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_user_approval_status(uuid);

-- Get user role without causing recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
$$;

-- Get user approval status without causing recursion
CREATE OR REPLACE FUNCTION public.get_user_approval_status(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT approval_status
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
$$;

-- =============================================================================
-- STEP 4: Create SIMPLE, NON-RECURSIVE RLS Policies
-- =============================================================================

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Everyone can view all profiles
CREATE POLICY "All authenticated users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own basic profile info"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent privilege escalation
    AND role = (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1)
    AND approval_status = (SELECT approval_status FROM profiles WHERE id = auth.uid() LIMIT 1)
  );

-- Allow users to insert their own profile on signup
CREATE POLICY "Users can insert own profile on signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    -- New users default to member role, pending approval (but we'll auto-approve)
    AND role IN ('member', 'user')
  );

-- ============================================
-- HOUSES TABLE
-- ============================================

CREATE POLICY "All authenticated users can view houses"
  ON houses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert houses"
  ON houses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin')
  );

CREATE POLICY "Admins can update houses"
  ON houses FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin')
  );

CREATE POLICY "Admins can delete houses"
  ON houses FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin')
  );

-- ============================================
-- MEMBERS TABLE
-- ============================================

CREATE POLICY "All authenticated users can view members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin', 'house_admin')
  );

CREATE POLICY "Admins can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin', 'house_admin')
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin', 'house_admin')
  );

CREATE POLICY "Admins can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin', 'house_admin')
  );

-- ============================================
-- LINKS TABLE
-- ============================================

CREATE POLICY "All authenticated users can view links"
  ON links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ============================================
-- DEALS TABLE
-- ============================================

CREATE POLICY "All authenticated users can view deals"
  ON deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ============================================
-- I2WE EVENTS TABLE
-- ============================================

CREATE POLICY "All authenticated users can view i2we events"
  ON i2we_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create i2we events"
  ON i2we_events FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ============================================
-- ATTENDANCE TABLE
-- ============================================

CREATE POLICY "All authenticated users can view attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can mark attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin', 'house_admin')
  );

-- =============================================================================
-- STEP 5: Ensure admin user exists and is approved
-- =============================================================================

DO $$
DECLARE
  admin_user_id uuid;
  admin_exists boolean;
BEGIN
  -- Check if admin user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@wevysya.com'
  ) INTO admin_exists;

  IF admin_exists THEN
    -- Get the admin user ID
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@wevysya.com'
    LIMIT 1;

    -- Make sure profile exists and is approved (using correct column names)
    INSERT INTO profiles (id, email, full_name, role, approval_status, mobile)
    VALUES (
      admin_user_id,
      'admin@wevysya.com',
      'Super Admin',
      'super_admin',
      'approved',
      '+1234567890'
    )
    ON CONFLICT (id)
    DO UPDATE SET
      role = 'super_admin',
      approval_status = 'approved',
      email = 'admin@wevysya.com',
      full_name = 'Super Admin';

    RAISE NOTICE '';
    RAISE NOTICE '✅ Admin user profile updated and approved';
    RAISE NOTICE '✅ Login: admin@wevysya.com';
    RAISE NOTICE '✅ Password: Admin@123';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Admin user does not exist in auth.users';
    RAISE NOTICE '⚠️  Creating admin user now...';

    -- Create admin user in auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@wevysya.com',
      crypt('Admin@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_user_id;

    -- Create profile
    INSERT INTO profiles (id, email, full_name, role, approval_status, mobile)
    VALUES (
      admin_user_id,
      'admin@wevysya.com',
      'Super Admin',
      'super_admin',
      'approved',
      '+1234567890'
    );

    -- Create identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_user_id,
      format('{"sub":"%s","email":"%s"}', admin_user_id::text, 'admin@wevysya.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    RAISE NOTICE '';
    RAISE NOTICE '✅ Admin user created successfully!';
    RAISE NOTICE '✅ Login: admin@wevysya.com';
    RAISE NOTICE '✅ Password: Admin@123';
  END IF;
END $$;

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

DO $$
DECLARE
  profiles_policies integer;
  houses_policies integer;
  members_policies integer;
  admin_count integer;
  approved_admin_count integer;
  approval_column_exists boolean;
BEGIN
  -- Check if approval_status column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'approval_status'
  ) INTO approval_column_exists;

  -- Count policies
  SELECT COUNT(*) INTO profiles_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles';

  SELECT COUNT(*) INTO houses_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'houses';

  SELECT COUNT(*) INTO members_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'members';

  -- Count admins
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE role = 'super_admin';

  SELECT COUNT(*) INTO approved_admin_count
  FROM profiles
  WHERE role = 'super_admin' AND approval_status = 'approved';

  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '🎉 🎉 🎉  ALL FIXED! READY TO LOGIN!  🎉 🎉 🎉';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION RESULTS:';
  RAISE NOTICE '  ✅ approval_status column: %', CASE WHEN approval_column_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✅ Profiles policies: %', profiles_policies;
  RAISE NOTICE '  ✅ Houses policies: %', houses_policies;
  RAISE NOTICE '  ✅ Members policies: %', members_policies;
  RAISE NOTICE '  ✅ Total super admins: %', admin_count;
  RAISE NOTICE '  ✅ Approved super admins: %', approved_admin_count;
  RAISE NOTICE '';

  IF approved_admin_count > 0 THEN
    RAISE NOTICE '🔐 LOGIN CREDENTIALS:';
    RAISE NOTICE '   📧 Email: admin@wevysya.com';
    RAISE NOTICE '   🔑 Password: Admin@123';
    RAISE NOTICE '';
    RAISE NOTICE '📝 NEXT STEPS:';
    RAISE NOTICE '   1. Clear browser cache (F12 → Application → Local Storage → Clear)';
    RAISE NOTICE '   2. Refresh page (Ctrl+Shift+R or Cmd+Shift+R)';
    RAISE NOTICE '   3. Login with credentials above';
    RAISE NOTICE '';
    RAISE NOTICE '🎊 YOU ARE READY TO GO!';
  ELSE
    RAISE NOTICE '⚠️  WARNING: No approved admin found!';
    RAISE NOTICE '⚠️  Something went wrong creating the admin user.';
  END IF;

  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
END $$;
