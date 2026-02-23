-- ============================================
-- CHECK WHAT'S FAILING IN SIGNUP
-- ============================================

-- 1. Check if any auth users were created without profiles
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created,
  p.id as profile_exists,
  up.id as users_profile_exists
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN users_profile up ON up.id = u.id
WHERE u.created_at > NOW() - INTERVAL '1 hour'
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. Check if trigger is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as status,
  CASE 
    WHEN tgenabled = 'O' THEN '✓ Enabled'
    WHEN tgenabled = 'D' THEN '✗ DISABLED - THIS IS THE PROBLEM!'
    ELSE 'Unknown'
  END as description
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. View the trigger function to check for issues
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 4. Check recent auth users
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check if there are partial profiles created
SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE full_name IS NULL) as missing_name_count
FROM profiles;
