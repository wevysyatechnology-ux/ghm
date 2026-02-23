-- ============================================================================
-- COMPLETE FIX FOR LOGIN ISSUES
-- Run this entire script in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Add auth_user_id column if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  -- Check if auth_user_id column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'auth_user_id'
  ) THEN
    -- Add the column
    ALTER TABLE profiles ADD COLUMN auth_user_id uuid;

    -- Add foreign key constraint
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_auth_user_id_fkey
    FOREIGN KEY (auth_user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Added auth_user_id column to profiles table';
  ELSE
    RAISE NOTICE 'auth_user_id column already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Remove old foreign key constraint on id if it exists
-- ============================================================================

DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
    RAISE NOTICE 'Removed old profiles_id_fkey constraint';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Update handle_new_user function
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    id,
    auth_user_id,
    email,
    full_name,
    role
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    auth_user_id = NEW.id,
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- PART 4: Update RLS Policies - Allow profile reads
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert member profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete member profiles" ON profiles;

-- Create new comprehensive policies

-- SELECT policies (most permissive for reads)
CREATE POLICY "Anyone authenticated can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policies
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('super_admin', 'global_admin')
    )
  );

-- UPDATE policies
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auth_user_id
    OR auth.uid() = id
  )
  WITH CHECK (
    auth.uid() = auth_user_id
    OR auth.uid() = id
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('super_admin', 'global_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('super_admin', 'global_admin')
    )
  );

-- DELETE policies
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('super_admin', 'global_admin')
    )
  );

-- ============================================================================
-- PART 5: Delete existing admin user if exists
-- ============================================================================

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@wevysya.com';

  IF admin_user_id IS NOT NULL THEN
    -- Delete from identities first
    DELETE FROM auth.identities WHERE user_id = admin_user_id;

    -- Delete from profiles
    DELETE FROM profiles WHERE id = admin_user_id OR auth_user_id = admin_user_id;

    -- Delete from users
    DELETE FROM auth.users WHERE id = admin_user_id;

    RAISE NOTICE 'Deleted existing admin user';
  END IF;
END $$;

-- ============================================================================
-- PART 6: Create new super admin user
-- ============================================================================

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Generate a new UUID
  new_user_id := gen_random_uuid();

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
    new_user_id,
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
  );

  -- Insert into profiles with BOTH id and auth_user_id set
  INSERT INTO profiles (
    id,
    auth_user_id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    new_user_id,
    'admin@wevysya.com',
    'WeVysya Admin',
    'super_admin',
    NOW(),
    NOW()
  );

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
    new_user_id,
    json_build_object(
      'sub', new_user_id::text,
      'email', 'admin@wevysya.com',
      'email_verified', true,
      'provider', 'email'
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created new admin user with ID: %', new_user_id;
END $$;

-- ============================================================================
-- PART 7: Verify the setup
-- ============================================================================

-- Check auth.users
SELECT
  '✓ AUTH USER' as check_type,
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.encrypted_password IS NOT NULL as has_password
FROM auth.users u
WHERE u.email = 'admin@wevysya.com';

-- Check profiles
SELECT
  '✓ PROFILE' as check_type,
  p.id,
  p.auth_user_id,
  p.email,
  p.full_name,
  p.role
FROM profiles p
WHERE p.email = 'admin@wevysya.com';

-- Check identities
SELECT
  '✓ IDENTITY' as check_type,
  i.provider,
  i.identity_data->>'email' as email,
  i.user_id
FROM auth.identities i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'admin@wevysya.com';

-- Final success message
SELECT
  '✓✓✓ SETUP COMPLETE ✓✓✓' as status,
  'Email: admin@wevysya.com' as email,
  'Password: Admin@123' as password,
  'You can now log in!' as message;
