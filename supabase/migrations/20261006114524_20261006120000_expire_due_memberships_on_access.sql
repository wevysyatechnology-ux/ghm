/*
# Expire membership terms after their end date

1. New Function: `expire_due_memberships`
- Finds active membership terms whose end date is before today.
- Changes those terms to `expired`.
- Synchronizes the member status in both admin and mobile profile tables.
- Uses `end_date < current_date`, so the member remains active through the selected end date.

2. Automatic App Check
- The admin portal calls this function before loading the member list.
- This keeps statuses correct whenever the portal is opened or refreshed.
- No membership code is changed or reused.

3. Security
- The function is `SECURITY DEFINER` with a fixed search path.
- It only accepts calls from authenticated users.
- It returns only the number of terms updated and exposes no member data.
*/

CREATE OR REPLACE FUNCTION public.expire_due_memberships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count integer;
BEGIN
  UPDATE public.memberships
  SET status = 'expired',
      end_date = end_date
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < current_date;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  UPDATE public.profiles p
  SET membership_status = 'expired'
  WHERE p.id IN (
    SELECT m.member_id
    FROM public.memberships m
    WHERE m.status = 'expired'
      AND m.end_date IS NOT NULL
      AND m.end_date < current_date
  )
    AND p.membership_status = 'active';

  UPDATE public.users_profile up
  SET membership_status = 'expired'
  WHERE up.id IN (
    SELECT m.member_id
    FROM public.memberships m
    WHERE m.status = 'expired'
      AND m.end_date IS NOT NULL
      AND m.end_date < current_date
  )
    AND up.membership_status = 'active';

  RETURN v_expired_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_due_memberships() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_due_memberships() TO authenticated;
