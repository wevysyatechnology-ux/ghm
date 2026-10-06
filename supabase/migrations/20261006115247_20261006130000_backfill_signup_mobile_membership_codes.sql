/*
# Backfill membership codes for signup-created mobile profiles

1. Existing Data
- Fills missing `users_profile.membership_code` values from the matching `profiles.membership_code`.
- Uses the already-assigned membership code, so no new code is generated and no code is reused.
- Does not change any profile, membership term, status, or activity record.

2. Future Signup and Admin Upsert Behavior
- Extends the mobile-profile synchronization trigger to run after INSERT and UPDATE.
- If a mobile profile is created or upserted without a code, it automatically copies the code from `profiles`.
- If the admin changes a current code through the secure rejoin flow, the mobile profile remains synchronized.

3. Security
- The synchronization function remains `SECURITY DEFINER` with a fixed search path.
- It only copies a code from the matching profile identity.
- No new client-facing permissions are added.
*/

UPDATE public.users_profile up
SET membership_code = p.membership_code
FROM public.profiles p
WHERE up.id = p.id
  AND (up.membership_code IS NULL OR btrim(up.membership_code) = '')
  AND p.membership_code IS NOT NULL
  AND btrim(p.membership_code) <> '';

CREATE OR REPLACE FUNCTION public.sync_initial_mobile_membership_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.membership_code IS NULL OR btrim(NEW.membership_code) = '' THEN
    UPDATE public.users_profile up
    SET membership_code = p.membership_code
    FROM public.profiles p
    WHERE up.id = NEW.id
      AND p.id = NEW.id
      AND p.membership_code IS NOT NULL
      AND btrim(p.membership_code) <> '';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_initial_mobile_membership_code ON public.users_profile;
CREATE TRIGGER sync_initial_mobile_membership_code
AFTER INSERT OR UPDATE ON public.users_profile
FOR EACH ROW
WHEN (NEW.membership_code IS NULL OR btrim(NEW.membership_code) = '')
EXECUTE FUNCTION public.sync_initial_mobile_membership_code();

REVOKE ALL ON FUNCTION public.sync_initial_mobile_membership_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_initial_mobile_membership_code() TO service_role;
