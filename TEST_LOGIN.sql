-- ============================================================================
-- TEST LOGIN SETUP
-- Run this to verify your login setup is correct
-- ============================================================================

-- Test 1: Check if admin user exists in auth.users
SELECT
  '1. AUTH USER' as test,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL - Admin user not found in auth.users'
  END as result,
  COUNT(*) as count
FROM auth.users
WHERE email = 'admin@wevysya.com';

-- Test 2: Check if admin profile exists
SELECT
  '2. PROFILE' as test,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL - Admin profile not found'
  END as result,
  COUNT(*) as count
FROM profiles
WHERE email = 'admin@wevysya.com';

-- Test 3: Check if profile has correct role
SELECT
  '3. ROLE' as test,
  CASE
    WHEN role = 'super_admin' THEN '✓ PASS'
    ELSE '✗ FAIL - Role is ' || COALESCE(role, 'NULL') || ', should be super_admin'
  END as result,
  role
FROM profiles
WHERE email = 'admin@wevysya.com';

-- Test 4: Check if auth_user_id is set correctly
SELECT
  '4. AUTH_USER_ID' as test,
  CASE
    WHEN auth_user_id IS NOT NULL AND auth_user_id = id THEN '✓ PASS'
    WHEN auth_user_id IS NULL THEN '✗ FAIL - auth_user_id is NULL'
    ELSE '✗ FAIL - auth_user_id does not match id'
  END as result,
  id,
  auth_user_id
FROM profiles
WHERE email = 'admin@wevysya.com';

-- Test 5: Check if email is confirmed
SELECT
  '5. EMAIL CONFIRMED' as test,
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN '✓ PASS'
    ELSE '✗ FAIL - Email not confirmed'
  END as result,
  email_confirmed_at
FROM auth.users
WHERE email = 'admin@wevysya.com';

-- Test 6: Check if identity exists
SELECT
  '6. IDENTITY' as test,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL - No identity found'
  END as result,
  COUNT(*) as count
FROM auth.identities i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'admin@wevysya.com';

-- Test 7: Check RLS policies on profiles table
SELECT
  '7. RLS ENABLED' as test,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL - RLS not enabled on profiles'
  END as result
FROM pg_tables
WHERE tablename = 'profiles'
AND rowsecurity = true;

-- Test 8: Check if auth_user_id column exists
SELECT
  '8. AUTH_USER_ID COLUMN' as test,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL - auth_user_id column does not exist'
  END as result
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'auth_user_id';

-- Summary
SELECT
  '═══════════════════════════════════' as separator,
  '' as message
UNION ALL
SELECT
  'SUMMARY' as separator,
  'All tests above should show ✓ PASS' as message
UNION ALL
SELECT
  'LOGIN CREDENTIALS' as separator,
  '' as message
UNION ALL
SELECT
  'Email' as separator,
  'admin@wevysya.com' as message
UNION ALL
SELECT
  'Password' as separator,
  'Admin@123' as message
UNION ALL
SELECT
  '═══════════════════════════════════' as separator,
  '' as message;
