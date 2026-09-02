/*
# Fix NULL handling in mobile_app_access sync trigger

1. Purpose
- When `users_profile.mobile_app_access` is NULL (older rows), the sync trigger should treat it as `enabled` rather than leaving `profiles.mobile_app_access` stale.

2. Changes
- Updated sync function to map NULL to 'enabled'.
*/

CREATE OR REPLACE FUNCTION public.sync_mobile_app_access_to_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_text text;
BEGIN
  new_text := CASE
    WHEN NEW.mobile_app_access IS NULL OR NEW.mobile_app_access THEN 'enabled'
    ELSE 'disabled'
  END;

  UPDATE public.profiles
  SET mobile_app_access = new_text
  WHERE id = NEW.id
    AND mobile_app_access IS DISTINCT FROM new_text;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_mobile_app_access_to_users_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_bool boolean;
BEGIN
  new_bool := NEW.mobile_app_access IS NULL OR NEW.mobile_app_access = 'enabled';

  UPDATE public.users_profile
  SET mobile_app_access = new_bool
  WHERE id = NEW.id
    AND mobile_app_access IS DISTINCT FROM new_bool;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_mobile_app_access_to_profiles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_mobile_app_access_to_users_profile() FROM PUBLIC, anon, authenticated;
