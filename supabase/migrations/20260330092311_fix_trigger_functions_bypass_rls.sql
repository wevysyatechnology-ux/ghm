
/*
  # Fix trigger functions to bypass RLS

  Both handle_new_user and create_notification_preferences_for_user are
  SECURITY DEFINER triggers that fire on auth.users INSERT. At that point
  there is no active session, so auth.uid() returns NULL and all RLS INSERT
  policies that check auth.uid() block the inserts, causing
  "Database error creating new user".

  Fix: set row_security = off inside both functions so they can insert freely.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;

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
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.users_profile (
      id,
      full_name,
      phone_number,
      business_category,
      attendance_status,
      absence_count,
      is_suspended,
      membership_status
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'mobile',
      NEW.raw_user_meta_data->>'business',
      'normal',
      0,
      false,
      'active'
    )
    ON CONFLICT (id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.create_notification_preferences_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
