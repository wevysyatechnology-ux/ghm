-- ============================================
-- ALTERNATIVE: Test if we can create user via SQL
-- ============================================
-- This will help us see if there's a deeper trigger issue

-- Test creating a user directly (this should show us the actual error)
-- Don't actually run this, just for testing:
/*
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
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sqltest@example.com',
  crypt('test123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);
*/

-- Instead, let's check the actual database logs for the last error
-- Run this to see recent errors:
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%auth.users%' 
ORDER BY calls DESC 
LIMIT 10;
