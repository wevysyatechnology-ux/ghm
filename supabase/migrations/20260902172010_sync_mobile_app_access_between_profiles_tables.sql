/*
# Synchronize mobile app access between profiles tables

1. Purpose
- Keep the mobile app access setting consistent between the GHM member table and the Members-management table.
- GHM stores this setting in `users_profile.mobile_app_access` as a boolean.
- The Members screen stores this setting in `profiles.mobile_app_access` as text.

2. Data Changes
- Existing `profiles.mobile_app_access` values are aligned from `users_profile.mobile_app_access`.
- `TRUE` maps to `enabled`.
- `FALSE` maps to `disabled`.

3. Synchronization
- Changes in `users_profile.mobile_app_access` update the matching `profiles` row.
- Changes in `profiles.mobile_app_access` update the matching `users_profile` row.
- Updates only run when the value actually changes, preventing recursive updates.

4. Security
- Synchronization functions use a fixed `search_path`.
- Functions are restricted to trigger execution and are not granted for direct client use.
- Existing RLS policies remain unchanged.
*/

CREATE OR REPLACE FUNCTION public.sync_mobile_app_access_to_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET mobile_app_access = CASE
    WHEN NEW.mobile_app_access THEN 'enabled'
    ELSE 'disabled'
  END
  WHERE id = NEW.id
    AND mobile_app_access IS DISTINCT FROM CASE
      WHEN NEW.mobile_app_access THEN 'enabled'
      ELSE 'disabled'
    END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_mobile_app_access_to_users_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users_profile
  SET mobile_app_access = NEW.mobile_app_access = 'enabled'
  WHERE id = NEW.id
    AND mobile_app_access IS DISTINCT FROM (NEW.mobile_app_access = 'enabled');

  RETURN NEW;
END;
$$;

UPDATE public.profiles p
SET mobile_app_access = CASE
  WHEN up.mobile_app_access THEN 'enabled'
  ELSE 'disabled'
END
FROM public.users_profile up
WHERE up.id = p.id
  AND p.mobile_app_access IS DISTINCT FROM CASE
    WHEN up.mobile_app_access THEN 'enabled'
    ELSE 'disabled'
  END;

DROP TRIGGER IF EXISTS sync_mobile_app_access_from_users_profile ON public.users_profile;
CREATE TRIGGER sync_mobile_app_access_from_users_profile
AFTER UPDATE OF mobile_app_access ON public.users_profile
FOR EACH ROW
WHEN (OLD.mobile_app_access IS DISTINCT FROM NEW.mobile_app_access)
EXECUTE FUNCTION public.sync_mobile_app_access_to_profiles();

DROP TRIGGER IF EXISTS sync_mobile_app_access_from_profiles ON public.profiles;
CREATE TRIGGER sync_mobile_app_access_from_profiles
AFTER UPDATE OF mobile_app_access ON public.profiles
FOR EACH ROW
WHEN (OLD.mobile_app_access IS DISTINCT FROM NEW.mobile_app_access)
EXECUTE FUNCTION public.sync_mobile_app_access_to_users_profile();

REVOKE ALL ON FUNCTION public.sync_mobile_app_access_to_profiles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_mobile_app_access_to_users_profile() FROM PUBLIC, anon, authenticated;
