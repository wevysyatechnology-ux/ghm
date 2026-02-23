-- ============================================================================
-- SIMPLE FIX FOR LOGIN - RUN THIS SCRIPT
-- ============================================================================
-- This script will fix your login issue in 3 simple steps
-- ============================================================================

-- STEP 1: Add auth_user_id column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN auth_user_id uuid;
    ALTER TABLE profiles ADD CONSTRAINT profiles_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

    -- Update existing profiles to set auth_user_id = id
    UPDATE profiles SET auth_user_id = id WHERE auth_user_id IS NULL;
  END IF;
END $$;

-- STEP 2: Update RLS policies to allow authenticated users to read profiles
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON profiles;
CREATE POLICY "Anyone authenticated can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- STEP 3: Delete and recreate admin user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Delete existing admin if exists
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@wevysya.com';

  IF admin_user_id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = admin_user_id;
    DELETE FROM profiles WHERE id = admin_user_id OR auth_user_id = admin_user_id;
    DELETE FROM auth.users WHERE id = admin_user_id;
  END IF;

  -- Generate new UUID
  admin_user_id := gen_random_uuid();

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
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_user_id,
    'authenticated',
    'authenticated',
    'admin@wevysya.com',
    crypt('Admin@123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    ''
  );

  -- Create admin profile
  INSERT INTO profiles (
    id,
    auth_user_id,
    email,
    full_name,
    role
  ) VALUES (
    admin_user_id,
    admin_user_id,
    'admin@wevysya.com',
    'WeVysya Admin',
    'super_admin'
  );

  -- Create identity for email login
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
    jsonb_build_object(
      'sub', admin_user_id::text,
      'email', 'admin@wevysya.com',
      'email_verified', true
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Admin user created with ID: %', admin_user_id;
END $$;

-- VERIFICATION: Check if everything is set up correctly
SELECT
  '✓ SETUP COMPLETE' as status,
  u.email,
  p.full_name,
  p.role,
  p.auth_user_id IS NOT NULL as has_auth_user_id
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'admin@wevysya.com';

-- Show login credentials
SELECT
  'LOGIN CREDENTIALS' as info,
  'Email: admin@wevysya.com' as email,
  'Password: Admin@123' as password;
