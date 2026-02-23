/*
  # Simplify trigger to debug exact error

  1. Changes
    - Remove all exception handling to see exact error
    - Simplify logic to minimum
    - Keep only essential INSERT into profiles
*/

-- Drop and recreate trigger function with minimal code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Only create profile if metadata has full_name
  IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    
    -- Simple insert into profiles table
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      mobile,
      business,
      industry,
      role,
      approval_status,
      auth_user_id
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'mobile',
      NEW.raw_user_meta_data->>'business',
      NEW.raw_user_meta_data->>'industry',
      'member',
      'pending',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
