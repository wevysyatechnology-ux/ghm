/*
  # WeVysya GHM 2.0 - Complete Database Setup

  INSTRUCTIONS:
  1. Go to: https://vlwppdpodavowfnyhtkh.supabase.co/project/vlwppdpodavowfnyhtkh/editor
  2. Click "SQL Editor" in the left sidebar
  3. Click "New Query"
  4. Copy and paste this ENTIRE file
  5. Click "Run" to execute

  This will set up your complete database schema with approval system.
*/

-- =============================================================================
-- STEP 1: Create Base Tables
-- =============================================================================

-- Create houses table
CREATE TABLE IF NOT EXISTS houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  country text DEFAULT '',
  zone text NOT NULL,
  email text,
  mobile text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin', 'member')),
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  house_id uuid REFERENCES houses(id),
  zone text,
  business text,
  industry text,
  keywords text[] DEFAULT '{}',
  avatar_url text,
  mobile text,
  created_at timestamptz DEFAULT now()
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  house_id uuid REFERENCES houses(id),
  business text,
  industry text,
  keywords text[] DEFAULT '{}',
  joined_at timestamptz DEFAULT now()
);

-- Create links table
CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id uuid REFERENCES profiles(id),
  to_member_id uuid REFERENCES profiles(id),
  description text NOT NULL,
  house_id uuid REFERENCES houses(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  from_member_id uuid REFERENCES profiles(id),
  to_member_id uuid REFERENCES profiles(id),
  description text NOT NULL,
  house_id uuid REFERENCES houses(id),
  deal_date date NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create i2we_events table
CREATE TABLE IF NOT EXISTS i2we_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES profiles(id),
  event_name text NOT NULL,
  description text,
  event_date date NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  member_id uuid REFERENCES profiles(id),
  marked_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- STEP 2: Add Missing Columns to Existing Tables
-- =============================================================================

-- Add approval_status to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN approval_status text DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Add country to houses if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'houses' AND column_name = 'country'
  ) THEN
    ALTER TABLE houses ADD COLUMN country text DEFAULT '';
  END IF;
END $$;

-- Set existing members to approved status
UPDATE profiles
SET approval_status = 'approved'
WHERE approval_status IS NULL OR approval_status = '';

-- =============================================================================
-- STEP 3: Create Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_house_id ON profiles(house_id);
CREATE INDEX IF NOT EXISTS idx_members_profile_id ON members(profile_id);
CREATE INDEX IF NOT EXISTS idx_members_house_id ON members(house_id);
CREATE INDEX IF NOT EXISTS idx_links_house_id ON links(house_id);
CREATE INDEX IF NOT EXISTS idx_deals_house_id ON deals(house_id);

-- =============================================================================
-- STEP 4: Enable Row Level Security
-- =============================================================================

ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE i2we_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: Drop Existing Policies (to avoid conflicts)
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
-- STEP 6: Create RLS Policies
-- =============================================================================

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Houses policies
CREATE POLICY "Authenticated users can view houses"
  ON houses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert houses"
  ON houses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

CREATE POLICY "Admins can update houses"
  ON houses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

CREATE POLICY "Admins can delete houses"
  ON houses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

-- Members policies
CREATE POLICY "Authenticated users can view members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'house_admin')
    )
  );

CREATE POLICY "Admins can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'house_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'house_admin')
    )
  );

CREATE POLICY "Admins can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'house_admin')
    )
  );

-- Links policies
CREATE POLICY "Authenticated users can view links"
  ON links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Deals policies
CREATE POLICY "Authenticated users can view deals"
  ON deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- I2WE events policies
CREATE POLICY "Authenticated users can view i2we events"
  ON i2we_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create i2we events"
  ON i2we_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Attendance policies
CREATE POLICY "Authenticated users can view attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can mark attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'house_admin')
    )
  );

-- =============================================================================
-- STEP 7: Create Functions
-- =============================================================================

-- Function to create profile on signup
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

-- Function to approve/reject members
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
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'global_admin')
  ) THEN
    RAISE EXCEPTION 'Only super admins and global admins can approve members';
  END IF;

  IF new_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected';
  END IF;

  UPDATE profiles
  SET approval_status = new_status
  WHERE id = member_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_member(uuid, text) TO authenticated;

-- =============================================================================
-- STEP 8: Create Triggers
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- STEP 9: Create Admin User
-- =============================================================================

-- This will create an admin account that you can use to login
-- Email: admin@wevysya.com
-- Password: Admin@123

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@wevysya.com'
  LIMIT 1;

  -- If admin doesn't exist, create it
  IF admin_user_id IS NULL THEN
    -- Insert into auth.users
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

    -- Insert into auth.identities
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
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      approval_status
    ) VALUES (
      admin_user_id,
      'admin@wevysya.com',
      'Super Admin',
      'super_admin',
      'approved'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      approval_status = 'approved';

    RAISE NOTICE '✅ Admin user created successfully!';
    RAISE NOTICE 'Email: admin@wevysya.com';
    RAISE NOTICE 'Password: Admin@123';
  ELSE
    -- Update existing admin to ensure they have correct role and approval
    UPDATE profiles
    SET
      role = 'super_admin',
      approval_status = 'approved'
    WHERE id = admin_user_id;

    RAISE NOTICE '✅ Admin user already exists and has been updated!';
    RAISE NOTICE 'Email: admin@wevysya.com';
    RAISE NOTICE 'Password: Admin@123';
  END IF;
END $$;

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

DO $$
DECLARE
  tables_count integer;
  admin_count integer;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'houses', 'members', 'links', 'deals', 'i2we_events', 'attendance');

  -- Count admin users
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE role = 'super_admin' AND approval_status = 'approved';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ ✅ ✅ DATABASE SETUP COMPLETE! ✅ ✅ ✅';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created: %', tables_count;
  RAISE NOTICE 'Admin users: %', admin_count;
  RAISE NOTICE '';
  RAISE NOTICE 'LOGIN CREDENTIALS:';
  RAISE NOTICE 'Email: admin@wevysya.com';
  RAISE NOTICE 'Password: Admin@123';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now login to your application!';
  RAISE NOTICE '================================================';
END $$;
