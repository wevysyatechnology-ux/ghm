-- ============================================
-- DIAGNOSE AND FIX SIGNUP TRIGGER ISSUES
-- ============================================

-- 1. Check current trigger status
SELECT 
  t.tgname as trigger_name,
  t.tgenabled as status,
  CASE 
    WHEN t.tgenabled = 'O' THEN 'ENABLED (causing 500 errors!)'
    WHEN t.tgenabled = 'D' THEN 'DISABLED (good)'
    ELSE 'UNKNOWN'
  END as description,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname LIKE '%auth_user%' OR t.tgname LIKE '%new_user%';

-- 2. View the actual trigger function causing problems
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 3. Check profiles table policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. Check existing data to understand the pattern
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.approval_status,
  up.phone_number as users_profile_phone,
  p.mobile as profiles_mobile
FROM profiles p
LEFT JOIN users_profile up ON up.id = p.id
ORDER BY p.created_at DESC
LIMIT 5;
