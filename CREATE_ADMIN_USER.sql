-- ============================================================================
-- COMPLETE ADMIN USER SETUP - RUN THIS SCRIPT
-- ============================================================================
-- This script will completely reset and create the admin user
-- ============================================================================

-- STEP 1: Add auth_user_id column if it doesn't exist
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

    -- Update existing profiles
    UPDATE profiles SET auth_user_id = id WHERE auth_user_id IS NULL AND id IN (SELECT id FROM auth.users);

    RAISE NOTICE 'Added auth_user_id column';
  END IF;
END $$;

-- STEP 2: Update RLS - Allow authenticated users to read all profiles
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- STEP 3: Completely remove existing admin user (delete in correct order)
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Find all possible admin user IDs
  FOR admin_id IN
    SELECT DISTINCT id FROM auth.users WHERE email = 'admin@wevysya.com'
    UNION
    SELECT DISTINCT id FROM profiles WHERE email = 'admin@wevysya.com'
    UNION
    SELECT DISTINCT auth_user_id FROM profiles WHERE email = 'admin@wevysya.com' AND auth_user_id IS NOT NULL
  LOOP
    -- Delete in correct order (foreign keys first)
    DELETE FROM members WHERE profile_id = admin_id;
    DELETE FROM links WHERE from_member_id = admin_id OR to_member_id = admin_id OR created_by = admin_id;
    DELETE FROM deals WHERE from_member_id = admin_id OR to_member_id = admin_id OR created_by = admin_id;
    DELETE FROM i2we_events WHERE member_id = admin_id OR created_by = admin_id;
    DELETE FROM attendance WHERE member_id = admin_id OR marked_by = admin_id;
    DELETE FROM houses WHERE created_by = admin_id;
    DELETE FROM profiles WHERE id = admin_id OR auth_user_id = admin_id;
    DELETE FROM auth.identities WHERE user_id = admin_id;
    DELETE FROM auth.users WHERE id = admin_id;

    RAISE NOTICE 'Deleted user with ID: %', admin_id;
  END LOOP;
END $$;

-- STEP 4: Create fresh admin user
DO $$
DECLARE
  new_admin_id uuid;
BEGIN
  -- Generate new UUID
  new_admin_id := gen_random_uuid();

  -- Insert into auth.users
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
    new_admin_id,
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

  -- Insert into profiles
  INSERT INTO profiles (
    id,
    auth_user_id,
    email,
    full_name,
    role
  ) VALUES (
    new_admin_id,
    new_admin_id,
    'admin@wevysya.com',
    'WeVysya Admin',
    'super_admin'
  );

  -- Insert into identities
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
    new_admin_id,
    jsonb_build_object(
      'sub', new_admin_id::text,
      'email', 'admin@wevysya.com',
      'email_verified', true
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE '✓ Created admin user with ID: %', new_admin_id;
END $$;

-- STEP 5: Verify everything
DO $$
DECLARE
  user_count int;
  profile_count int;
  identity_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users WHERE email = 'admin@wevysya.com';
  SELECT COUNT(*) INTO profile_count FROM profiles WHERE email = 'admin@wevysya.com';
  SELECT COUNT(*) INTO identity_count FROM auth.identities i
    JOIN auth.users u ON i.user_id = u.id
    WHERE u.email = 'admin@wevysya.com';

  IF user_count = 1 AND profile_count = 1 AND identity_count = 1 THEN
    RAISE NOTICE '✓✓✓ SUCCESS ✓✓✓';
    RAISE NOTICE 'Admin user created successfully!';
    RAISE NOTICE 'Email: admin@wevysya.com';
    RAISE NOTICE 'Password: Admin@123';
  ELSE
    RAISE NOTICE '⚠ WARNING: Counts are off';
    RAISE NOTICE 'Users: % (expected 1)', user_count;
    RAISE NOTICE 'Profiles: % (expected 1)', profile_count;
    RAISE NOTICE 'Identities: % (expected 1)', identity_count;
  END IF;
END $$;

-- Show the created user
SELECT
  '✓ ADMIN USER DETAILS' as status,
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.auth_user_id,
  u.email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'admin@wevysya.com';
