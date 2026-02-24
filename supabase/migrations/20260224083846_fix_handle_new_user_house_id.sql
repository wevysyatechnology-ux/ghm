/*
  # Fix handle_new_user trigger to include house_id

  ## Problem
  The handle_new_user trigger function was inserting into profiles table
  but NOT including house_id from user metadata, causing house_id to be NULL.

  ## Changes
  - Updated handle_new_user function to read house_id from raw_user_meta_data
  - house_id is now inserted into profiles table during signup
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN

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
      auth_user_id
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'mobile',
      NEW.raw_user_meta_data->>'business',
      NEW.raw_user_meta_data->>'industry',
      NULLIF(NEW.raw_user_meta_data->>'house_id', '')::uuid,
      'member',
      'pending',
      NEW.id
    );

    INSERT INTO public.users_profile (
      id,
      full_name,
      phone_number,
      business_category,
      attendance_status,
      absence_count,
      is_suspended
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'mobile',
      NEW.raw_user_meta_data->>'business',
      'normal',
      0,
      false
    );

  END IF;

  RETURN NEW;
END;
$$;
