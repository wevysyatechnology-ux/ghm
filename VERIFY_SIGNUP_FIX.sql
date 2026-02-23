-- ============================================
-- QUICK TEST: Verify Signup Fix is Working
-- ============================================
-- Run these queries AFTER applying FIX_SIGNUP_COMPLETE.sql
-- to verify everything is configured correctly
-- ============================================

-- TEST 1: Check if tables exist
-- ==============================
SELECT 
  'users_profile' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'users_profile'
  ) as exists;

SELECT 
  'profiles' as table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'profiles'
  ) as exists;

-- TEST 2: Check if trigger exists and is enabled
-- ===============================================
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN '✓ Enabled'
    WHEN tgenabled = 'D' THEN '✗ Disabled'
    ELSE 'Unknown'
  END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- TEST 3: Check if functions exist
-- =================================
SELECT 
  proname as function_name,
  '✓ Exists' as status
FROM pg_proc 
WHERE proname IN ('handle_new_user', 'approve_member');

-- TEST 4: Check profiles table structure
-- =======================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
AND column_name IN ('id', 'email', 'full_name', 'mobile', 'business', 'industry', 'approval_status', 'role')
ORDER BY ordinal_position;

-- TEST 5: Check RLS policies on profiles
-- =======================================
SELECT 
  policyname as policy_name,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- TEST 6: View recent signups (if any)
-- =====================================
SELECT 
  id,
  email,
  full_name,
  role,
  approval_status,
  business,
  industry,
  mobile,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- TEST 7: Check pending approvals
-- ================================
SELECT 
  COUNT(*) as pending_count,
  '✓ System ready for approvals' as status
FROM profiles
WHERE approval_status = 'pending';

-- TEST 8: Verify trigger function code
-- =====================================
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'handle_new_user';

-- ============================================
-- CLEANUP TEST USER (if needed)
-- ============================================
-- If you created a test user and want to remove it:
-- UNCOMMENT and replace 'testuser@example.com' with actual email

/*
-- Delete test user profile
DELETE FROM profiles WHERE email = 'testuser@example.com';

-- Delete test user auth (requires admin access)
-- This needs to be done via Supabase Dashboard → Authentication → Users
-- Or use the DELETE button next to the user
*/

-- ============================================
-- CREATE FIRST ADMIN (if needed)
-- ============================================
-- If you need to manually create/promote an admin:
-- UNCOMMENT and replace email with your actual admin email

/*
UPDATE profiles
SET 
  role = 'super_admin',
  approval_status = 'approved'
WHERE email = 'your-admin-email@example.com';
*/

-- ============================================
-- VIEW ALL POLICIES (comprehensive check)
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'users_profile')
ORDER BY tablename, policyname;

-- ============================================
-- SUCCESS CRITERIA
-- ============================================
-- ✓ Both tables (users_profile, profiles) exist
-- ✓ Trigger 'on_auth_user_created' is enabled
-- ✓ Functions 'handle_new_user' and 'approve_member' exist
-- ✓ profiles table has approval_status column
-- ✓ RLS policies are configured
-- ✓ No pending errors in logs
-- ============================================
