/*
  # Fix signup trigger conflict

  1. Problem
    - Trigger automatically creates profile when auth user is created
    - Signup form also tries to create profile manually
    - This causes duplicate key error

  2. Solution
    - Drop the old trigger that creates incomplete profiles
    - Create new trigger that creates complete profiles with all required fields
    - Update handle_new_user function to use proper metadata

  3. Changes
    - Drop existing trigger
    - Update handle_new_user function
    - Recreate trigger with proper implementation
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to handle all required fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create profile if metadata has full_name (indicating manual signup)
  IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    -- Insert into profiles table
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      mobile,
      business,
      industry,
      house_id,
      role,
      approval_status,
      auth_user_id,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.raw_user_meta_data->>'mobile',
      NEW.raw_user_meta_data->>'business',
      NEW.raw_user_meta_data->>'industry',
      (NEW.raw_user_meta_data->>'house_id')::uuid,
      'member',
      'pending',
      NEW.id,
      NOW()
    );

    -- Insert into users_profile table
    INSERT INTO public.users_profile (
      id,
      full_name,
      phone_number,
      business_category,
      created_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.raw_user_meta_data->>'mobile',
      NEW.raw_user_meta_data->>'business',
      NOW()
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
