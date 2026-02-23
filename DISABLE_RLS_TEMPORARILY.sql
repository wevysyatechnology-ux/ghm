-- ============================================
-- EMERGENCY FIX: Temporarily disable RLS on profiles
-- This will allow login while we fix the policies
-- ============================================

-- Disable RLS completely on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = false THEN '✓ RLS DISABLED - You can now login'
    ELSE '✗ RLS still enabled'
  END as status
FROM pg_tables
WHERE tablename = 'profiles';

-- Note: This allows anyone to read/write all profiles
-- We will re-enable RLS with proper policies after login works
