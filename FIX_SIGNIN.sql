-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR
-- This fixes the infinite recursion bug and creates your admin profile

-- Step 1: Fix infinite recursion in RLS policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Step 2: Create your super admin profile
INSERT INTO profiles (id, email, full_name, role)
SELECT
  id,
  email,
  'WeVysya Admin',
  'super_admin'
FROM auth.users
WHERE email = 'reachus@wevysya.com'
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin', full_name = 'WeVysya Admin';

-- Verify (you should see your profile with super_admin role)
SELECT id, email, full_name, role FROM profiles WHERE email = 'reachus@wevysya.com';