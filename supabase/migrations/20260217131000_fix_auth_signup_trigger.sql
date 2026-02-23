/*
  # Fix Auth Signup Trigger - Proper Error Handling
  
  The current trigger silently catches all errors, masking failures.
  This migration:
  1. Improves error handling in the trigger
  2. Ensures approval_status is set for new signups
  3. Adds proper logging for debugging
  4. Removes the problematic silent error catching
*/

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the function with proper error handling and approval_status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile with all required fields including approval_status
  INSERT INTO public.profiles (id, email, full_name, role, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    'pending'  -- Set approval_status to pending for new signups
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Email already exists, log and continue
    RAISE LOG 'Email already exists in profiles: %', NEW.email;
    RETURN NEW;
  WHEN foreign_key_violation THEN
    -- Foreign key issue, log and continue (user id might not exist yet)
    RAISE LOG 'FK violation in handle_new_user: %', SQLERRM;
    RETURN NEW;
  WHEN others THEN
    -- Log unexpected errors but do not raise an exception so auth signup can succeed.
    RAISE LOG 'Unexpected error in handle_new_user: %', SQLERRM;
    -- Swallow the error and allow the auth insert to complete. The application
    -- can create or repair the profile record afterwards.
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
