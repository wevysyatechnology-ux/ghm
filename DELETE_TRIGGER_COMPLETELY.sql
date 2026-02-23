-- ============================================
-- LAST RESORT: Recreate trigger with all permissions
-- ============================================

-- Drop completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Don't recreate the trigger at all
-- Let the app handle everything

-- Verify no trigger exists
SELECT 
  COUNT(*) as trigger_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ SUCCESS: No trigger on auth.users'
    ELSE '✗ PROBLEM: Trigger still exists'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
AND c.relname = 'users'
AND t.tgname LIKE '%new_user%';
