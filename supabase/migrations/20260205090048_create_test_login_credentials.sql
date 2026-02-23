/*
  # Create Test Login Credentials

  1. Purpose
    - Creates test user accounts for development and testing
    - Sets up admin user with super_admin privileges
    - Ensures profiles are properly linked to auth users

  2. Test Credentials Created
    - Email: admin@wevysya.com
    - Password: Admin@123
    - Role: super_admin

  3. Security Notes
    - These are TEST credentials only
    - Should be changed in production
    - Password is hashed using Supabase's auth system
*/

-- Create test admin user in auth.users
-- Password: Admin@123 (hashed using crypt)
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Generate a fixed UUID for the test user
  test_user_id := gen_random_uuid();
  
  -- Insert into auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@wevysya.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      test_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@wevysya.com',
      crypt('Admin@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"WeVysya Admin"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated'
    );

    -- Insert into profiles
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      created_at
    ) VALUES (
      test_user_id,
      'admin@wevysya.com',
      'WeVysya Admin',
      'super_admin',
      now()
    );
  END IF;
END $$;