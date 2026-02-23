/*
  # Fix trigger RLS permissions for signup

  1. Problem
    - Trigger function runs with SECURITY DEFINER but can't insert into users_profile
    - RLS policies block the trigger from inserting data
    - This causes "Database error saving new user" 500 error

  2. Solution
    - Update RLS policies to allow service role to insert
    - Grant proper permissions to the trigger function
    - Ensure trigger bypasses RLS when needed

  3. Changes
    - Drop and recreate users_profile INSERT policy to allow service role
    - Update trigger function to use proper security context
*/

-- Drop existing INSERT policy on users_profile
DROP POLICY IF EXISTS "Users can insert own profile" ON users_profile;

-- Create new policy that allows both authenticated users and service role
CREATE POLICY "Allow profile creation during signup"
  ON users_profile
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Update the trigger function to ensure it can write to both tables
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
      v_house_id,
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
  WHEN OTHERS THEN
    -- Log the actual error for debugging
    RAISE LOG 'Error in handle_new_user for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
    RAISE EXCEPTION 'Database error saving new user: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
