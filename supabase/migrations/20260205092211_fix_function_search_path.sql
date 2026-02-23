/*
  # Fix Function Search Path Security

  1. Purpose
    - Set secure search_path for handle_new_user function
    - Prevents potential SQL injection through search_path manipulation
    - Ensures function uses only explicitly specified schemas

  2. Changes
    - Drop and recreate handle_new_user with SECURITY DEFINER and stable search_path
    - Explicitly set search_path to 'public'

  3. Security Impact
    - Prevents malicious search_path changes from affecting function behavior
    - Ensures function always references correct schema objects
*/

-- Drop existing function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'member'
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();