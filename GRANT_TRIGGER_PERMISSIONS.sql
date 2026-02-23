-- ============================================
-- CREATE RPC FUNCTION TO SIGNUP USERS (bypasses trigger)
-- ============================================

-- This function will be called from the app instead of supabase.auth.signUp()
-- It creates the auth user and profile in one transaction

CREATE OR REPLACE FUNCTION public.signup_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_mobile text,
  p_business text,
  p_industry text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- This would need Service Role key to work
  -- For now, just create the profile after signup succeeds
  
  RAISE EXCEPTION 'This function requires Service Role access';
  
END;
$$;

-- ============================================
-- BETTER SOLUTION: Grant proper permissions to trigger
-- ============================================

-- Grant execute on the trigger function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Grant insert on profiles to the trigger function owner
GRANT INSERT ON profiles TO postgres;
GRANT INSERT ON profiles TO authenticated;
GRANT INSERT ON profiles TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Permissions granted for trigger function';
END $$;
