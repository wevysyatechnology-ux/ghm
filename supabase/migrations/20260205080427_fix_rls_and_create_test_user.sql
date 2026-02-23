/*
  # Fix RLS Infinite Recursion and Create Test User

  1. Changes
    - Fix infinite recursion in profiles RLS policies
    - Remove problematic policies that query the same table
    - Create simpler, non-recursive policies
    - Create test user with proper authentication

  2. Security
    - All users can view their own profile
    - Authenticated users can view all profiles (simplified for now)
    - Users can update their own profile
    - Users can insert their own profile on signup
*/

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create test admin user using Supabase's internal functions
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert user into auth.users (this simulates what Supabase Auth does)
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
    crypt('Admin123!', gen_salt('bf')),
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
  ) RETURNING id INTO new_user_id;

  -- Manually create profile (trigger might not fire for manual inserts)
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    new_user_id,
    'admin@wevysya.com',
    'WeVysya Admin',
    'super_admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'super_admin', full_name = 'WeVysya Admin';

END $$;
