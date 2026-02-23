/*
  # Create Test Admin User

  1. Purpose
    - Creates a test admin user for development and testing
    - Email: admin@wevysya.com
    - Password: Admin123!
    - Role: super_admin

  2. Security
    - User is created with authenticated role
    - Profile is automatically created via trigger
    - RLS policies will control access based on role
*/

-- Create test admin user
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = 'admin@wevysya.com';

  -- Only create if user doesn't exist
  IF new_user_id IS NULL THEN
    -- Insert user into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
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
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO new_user_id;

    -- Create profile for the user
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
      new_user_id,
      'admin@wevysya.com',
      'WeVysya Admin',
      'super_admin'
    );
  END IF;
END $$;
