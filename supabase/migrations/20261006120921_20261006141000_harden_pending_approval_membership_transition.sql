/*
# Harden pending approval membership transitions

1. Modified Function: `approve_member`
- Keeps the public RPC parameter names used by the approval screen.
- Uses local variables for the target member so rejection safely expires only that member's active terms.
- Preserves the rule that approval assigns the next membership code and rejection leaves the member without one.

2. Security
- Keeps the existing super-admin/global-admin authorization and fixed search path.
- Does not change any table permissions or expose membership history to pending members.
*/

CREATE OR REPLACE FUNCTION public.approve_member(member_id uuid, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role text;
  current_profile public.profiles%ROWTYPE;
  target_member_id uuid := member_id;
  target_status text := new_status;
BEGIN
  SELECT role INTO admin_role
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;

  IF auth.role() <> 'service_role' AND admin_role NOT IN ('super_admin', 'global_admin') THEN
    RAISE EXCEPTION 'Only GHM admins can approve members' USING ERRCODE = '42501';
  END IF;

  IF target_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO current_profile
  FROM public.profiles
  WHERE id = target_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = '22023';
  END IF;

  IF target_status = 'approved' THEN
    IF current_profile.approval_status = 'approved'
       AND current_profile.membership_code IS NOT NULL
       AND coalesce(current_profile.membership_status, 'active') = 'active' THEN
      RETURN;
    END IF;

    PERFORM public.assign_active_membership(target_member_id);

    UPDATE public.profiles
    SET approval_status = 'approved', updated_at = now()
    WHERE id = target_member_id;
  ELSE
    UPDATE public.memberships AS membership
    SET status = 'expired',
        end_date = coalesce(membership.end_date, current_date)
    WHERE membership.member_id = target_member_id
      AND membership.status = 'active';

    UPDATE public.profiles
    SET approval_status = 'rejected',
        membership_code = NULL,
        updated_at = now()
    WHERE id = target_member_id;

    UPDATE public.users_profile
    SET membership_code = NULL,
        membership_status = 'inactive',
        is_suspended = true
    WHERE id = target_member_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_member(uuid, text) TO authenticated, service_role;
