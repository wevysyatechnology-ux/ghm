/*
  # Remove users_profile insertion from signup trigger

  1. Problem
    - Trigger is failing when trying to insert into users_profile table
    - Getting "Database error saving new user" 500 error
    
  2. Solution
    - Remove users_profile INSERT from trigger function
    - Only insert into profiles table during signup
    - users_profile can be populated later by admin or separate process

  3. Changes
    - Update handle_new_user() function to only insert into profiles table
*/

-- Update the trigger function to only insert into profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_house_id uuid;
BEGIN
  -- Only create profile if metadata has full_name (indicating manual signup)
  IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    
    -- Convert house_id string to UUID if present
    BEGIN
      IF NEW.raw_user_meta_data->>'house_id' IS NOT NULL AND NEW.raw_user_meta_data->>'house_id' != '' THEN
        v_house_id := (NEW.raw_user_meta_data->>'house_id')::uuid;
      ELSE
        v_house_id := NULL;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_house_id := NULL;
    END;

    -- Insert into profiles table only
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
      v_house_id,
      'member',
      'pending',
      NEW.id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the actual error for debugging
    RAISE LOG 'Error in handle_new_user for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
    RAISE EXCEPTION 'Database error saving new user: %', SQLERRM;
END;
$$;
