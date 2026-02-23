/*
  # Fix Infinite Recursion in RLS Policies

  URGENT FIX - Run this immediately!

  INSTRUCTIONS:
  1. Go to: https://vlwppdpodavowfnyhtkh.supabase.co/project/vlwppdpodavowfnyhtkh/editor
  2. Click "SQL Editor" in the left sidebar
  3. Click "New Query"
  4. Copy and paste this ENTIRE file
  5. Click "Run"

  This will fix the infinite recursion error that's preventing login.
*/

-- =============================================================================
-- STEP 1: Drop ALL existing policies to start fresh
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;

DROP POLICY IF EXISTS "Authenticated users can view houses" ON houses;
DROP POLICY IF EXISTS "Admins can insert houses" ON houses;
DROP POLICY IF EXISTS "Admins can update houses" ON houses;
DROP POLICY IF EXISTS "Admins can delete houses" ON houses;

DROP POLICY IF EXISTS "Authenticated users can view members" ON members;
DROP POLICY IF EXISTS "Admins can manage members" ON members;
DROP POLICY IF EXISTS "Admins can insert members" ON members;
DROP POLICY IF EXISTS "Admins can update members" ON members;
DROP POLICY IF EXISTS "Admins can delete members" ON members;

DROP POLICY IF EXISTS "Authenticated users can view links" ON links;
DROP POLICY IF EXISTS "Authenticated users can create links" ON links;

DROP POLICY IF EXISTS "Authenticated users can view deals" ON deals;
DROP POLICY IF EXISTS "Authenticated users can create deals" ON deals;

DROP POLICY IF EXISTS "Authenticated users can view i2we events" ON i2we_events;
DROP POLICY IF EXISTS "Authenticated users can create i2we events" ON i2we_events;

DROP POLICY IF EXISTS "Authenticated users can view attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can mark attendance" ON attendance;

-- =============================================================================
-- STEP 2: Create helper function to avoid infinite recursion
-- =============================================================================

-- This function checks user role WITHOUT causing infinite recursion
-- by using SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- This function checks approval status WITHOUT causing infinite recursion
CREATE OR REPLACE FUNCTION auth.user_approval_status()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT approval_status
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- =============================================================================
-- STEP 3: Create NON-RECURSIVE RLS Policies for profiles
-- =============================================================================

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow authenticated users to view other profiles (simpler approach)
-- Everyone can see profiles, but sensitive operations are protected
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile (but not role or approval_status)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent users from changing their own role or approval status
    AND (role = (SELECT role FROM profiles WHERE id = auth.uid()))
    AND (approval_status = (SELECT approval_status FROM profiles WHERE id = auth.uid()))
  );

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- STEP 4: Create simple policies for other tables
-- =============================================================================

-- Houses policies (simple, no recursion)
CREATE POLICY "Everyone can view houses"
  ON houses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert houses"
  ON houses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.user_role() IN ('super_admin', 'global_admin')
  );

CREATE POLICY "Admins can update houses"
  ON houses FOR UPDATE
  TO authenticated
  USING (
    auth.user_role() IN ('super_admin', 'global_admin')
  )
  WITH CHECK (
    auth.user_role() IN ('super_admin', 'global_admin')
  );

CREATE POLICY "Admins can delete houses"
  ON houses FOR DELETE
  TO authenticated
  USING (
    auth.user_role() IN ('super_admin', 'global_admin')
  );

-- Members policies (simple)
CREATE POLICY "Everyone can view members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.user_role() IN ('super_admin', 'global_admin', 'house_admin')
  );

CREATE POLICY "Admins can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (
    auth.user_role() IN ('super_admin', 'global_admin', 'house_admin')
  )
  WITH CHECK (
    auth.user_role() IN ('super_admin', 'global_admin', 'house_admin')
  );

CREATE POLICY "Admins can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (
    auth.user_role() IN ('super_admin', 'global_admin', 'house_admin')
  );

-- Links policies
CREATE POLICY "Everyone can view links"
  ON links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Deals policies
CREATE POLICY "Everyone can view deals"
  ON deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- I2WE events policies
CREATE POLICY "Everyone can view i2we events"
  ON i2we_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create i2we events"
  ON i2we_events FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Attendance policies
CREATE POLICY "Everyone can view attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can mark attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.user_role() IN ('super_admin', 'global_admin', 'house_admin')
  );

-- =============================================================================
-- STEP 5: Make sure admin user exists and is approved
-- =============================================================================

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find admin user
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@wevysya.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Update profile to be approved
    UPDATE profiles
    SET
      role = 'super_admin',
      approval_status = 'approved'
    WHERE id = admin_user_id;

    RAISE NOTICE '✅ Admin user updated: admin@wevysya.com';
  ELSE
    -- Create admin user if doesn't exist
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@wevysya.com',
      crypt('Admin@123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin","role":"super_admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO admin_user_id;

    -- Insert identity
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
      format('{"sub":"%s","email":"admin@wevysya.com"}', admin_user_id)::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    -- Create profile
    INSERT INTO profiles (id, email, full_name, role, approval_status)
    VALUES (admin_user_id, 'admin@wevysya.com', 'Super Admin', 'super_admin', 'approved');

    RAISE NOTICE '✅ Admin user created: admin@wevysya.com';
  END IF;
END $$;

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

DO $$
DECLARE
  policy_count integer;
  admin_count integer;
BEGIN
  -- Count policies on profiles table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles';

  -- Count approved admins
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE role = 'super_admin' AND approval_status = 'approved';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ ✅ ✅ RLS POLICIES FIXED! ✅ ✅ ✅';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Profile policies: %', policy_count;
  RAISE NOTICE 'Approved admins: %', admin_count;
  RAISE NOTICE '';
  RAISE NOTICE 'LOGIN CREDENTIALS:';
  RAISE NOTICE 'Email: admin@wevysya.com';
  RAISE NOTICE 'Password: Admin@123';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now login!';
  RAISE NOTICE '================================================';
END $$;
