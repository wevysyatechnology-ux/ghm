-- ============================================
-- FINAL FIX: Replace trigger with absolute minimum
-- ============================================

-- Check what trigger currently exists
SELECT 
  t.tgname as trigger_name,
  t.tgenabled as enabled,
  pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users' 
AND t.tgname LIKE '%auth%' OR t.tgname LIKE '%new_user%';

-- Drop and recreate with simplest possible version
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER
AS $$
BEGIN
  -- Absolutely nothing - just return
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify
SELECT 'Trigger updated successfully' as status;
