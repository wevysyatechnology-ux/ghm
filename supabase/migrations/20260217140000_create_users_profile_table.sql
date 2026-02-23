/*
  # Create users_profile table and fix signup trigger

  This migration:
  1. Creates the users_profile table with full_name and phone_number
  2. Fixes the handle_new_user trigger to insert into users_profile
  3. Ensures proper error handling for signup

  The users_profile table stores user-specific profile info.
*/

-- Create users_profile table if it doesn't exist
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users_profile
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

-- RLS policies for users_profile
DROP POLICY IF EXISTS "Users can read own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON users_profile;

CREATE POLICY "Users can read own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create improved trigger function that inserts into users_profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into users_profile with full_name and phone_number
  BEGIN
    INSERT INTO public.users_profile (id, full_name, phone_number)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
      COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL)
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE LOG 'User profile already exists: %', NEW.id;
    WHEN others THEN
      RAISE LOG 'Error creating user profile: %', SQLERRM;
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RAISE EXCEPTION 'Failed to create user account: %', SQLERRM;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_profile_id ON users_profile(id);
