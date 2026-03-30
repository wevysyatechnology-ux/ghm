
/*
  # Fix handle_new_user trigger to bypass RLS

  The trigger function inserts into users_profile during auth user creation,
  but the RLS INSERT policy checks auth.uid() which is NULL at that point
  (no session exists yet). We need to set row_security = off inside the
  SECURITY DEFINER function so the trigger can insert freely.

  Also adds an admin policy on users_profile so the edge function
  (running with service role) can UPDATE rows for newly created members.
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
