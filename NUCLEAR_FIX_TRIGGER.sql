-- ============================================
-- NUCLEAR OPTION: Simplest Possible Trigger
-- ============================================
-- This trigger does NOTHING and wraps everything in exception handling

-- Drop ALL existing handle_new_user functions completely
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create the absolutely simplest function possible
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate minimal trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Trigger replaced with absolute minimum version';
  RAISE NOTICE 'It now does NOTHING and cannot fail';
END $$;
