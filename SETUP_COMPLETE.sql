-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR
-- This fixes all migration issues and creates the super admin user

-- ============================================================================
-- PART 1: Fix Profile Schema to Allow Non-Auth Members
-- ============================================================================

-- Step 1: Add auth_user_id column to store optional link to auth.users
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Copy existing id values to auth_user_id for profiles linked to auth
UPDATE profiles
SET auth_user_id = id
WHERE id IN (SELECT id FROM auth.users);

-- Step 3: Drop the foreign key constraint on profiles.id
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 4: Update the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, auth_user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO UPDATE
  SET auth_user_id = NEW.id,
      email = NEW.email,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: Update RLS Policies
-- ============================================================================

-- Drop old policies that cause issues
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;

-- Create new policies that work with both auth and non-auth profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Admins can insert member profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

CREATE POLICY "Admins can delete member profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

-- ============================================================================
-- PART 3: Create Super Admin User
-- ============================================================================

-- First, check if user already exists and delete if necessary
DO $$
DECLARE
  user_exists boolean;
BEGIN
  -- Check if user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@wevysya.com'
  ) INTO user_exists;

  -- If exists, delete it
  IF user_exists THEN
    DELETE FROM auth.users WHERE email = 'admin@wevysya.com';
  END IF;
END $$;

-- Create the super admin user in auth.users
-- Password: Admin@123
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
  '{"full_name":"WeVysya Admin","role":"super_admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO UPDATE
SET
  encrypted_password = crypt('Admin@123', gen_salt('bf')),
  raw_user_meta_data = '{"full_name":"WeVysya Admin","role":"super_admin"}',
  updated_at = NOW();

-- Create or update the profile for super admin
INSERT INTO profiles (id, auth_user_id, email, full_name, role)
SELECT
  id,
  id,
  email,
  'WeVysya Admin',
  'super_admin'
FROM auth.users
WHERE email = 'admin@wevysya.com'
ON CONFLICT (id) DO UPDATE
SET
  auth_user_id = EXCLUDED.auth_user_id,
  role = 'super_admin',
  full_name = 'WeVysya Admin',
  email = 'admin@wevysya.com';

-- Also ensure email is in identities table
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  json_build_object(
    'sub', id::text,
    'email', email
  ),
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@wevysya.com'
ON CONFLICT (provider, user_id) DO UPDATE
SET
  identity_data = json_build_object(
    'sub', auth.identities.user_id::text,
    'email', 'admin@wevysya.com'
  ),
  updated_at = NOW();

-- ============================================================================
-- PART 4: Verify Setup
-- ============================================================================

-- Check if super admin was created successfully
SELECT
  u.id,
  u.email,
  u.created_at as user_created_at,
  p.full_name,
  p.role,
  p.auth_user_id
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.auth_user_id OR u.id = p.id
WHERE u.email = 'admin@wevysya.com';

-- Show all profiles
SELECT id, email, full_name, role, auth_user_id, created_at
FROM profiles
ORDER BY created_at DESC;
