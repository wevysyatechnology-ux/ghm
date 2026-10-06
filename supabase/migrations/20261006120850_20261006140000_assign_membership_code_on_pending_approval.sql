/*
# Assign membership codes only when pending members are approved

1. Signup Behavior
- `profiles.membership_code` becomes nullable and has no automatic sequence default.
- New pending signups therefore have no membership code.
- The initial membership-term trigger skips profiles without a code, so pending signups have no active membership term.

2. Existing Pending Records
- Existing pending profiles that previously received a code have that current code cleared.
- Their old generated terms are marked expired and retained in history so those codes remain permanently reserved.
- No code is reused.

3. Approval Behavior
- `approve_member(member_id, 'approved')` now takes the next value from the membership sequence.
- It creates the first active membership term, updates `profiles`, updates `users_profile`, and sets the approval/member status active.
- Approval is idempotent and does not issue another code if the member is already approved with an active code.
- Rejection leaves the member without a current membership code.

4. Direct Admin-Created Members
- Adds `assign_active_membership`, used by the trusted create-member flow for directly approved active members.
- It follows the same sequence, history, and synchronization rules.

5. Security
- Only super admins and global admins can approve or reject pending members.
- The direct assignment function is callable only by an approved top-level admin or the service role used by the protected create-member function.
- Both functions use `SECURITY DEFINER` with a fixed search path.
*/

ALTER TABLE public.profiles
  ALTER COLUMN membership_code DROP NOT NULL;
ALTER TABLE public.profiles
  ALTER COLUMN membership_code DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.create_initial_membership_term()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.membership_code IS NOT NULL AND btrim(NEW.membership_code) <> '' THEN
    INSERT INTO public.memberships (member_id, membership_code, start_date, end_date, status)
    VALUES (
      NEW.id,
      NEW.membership_code,
      NEW.created_at::date,
      CASE WHEN coalesce(NEW.membership_status, 'active') = 'active' THEN NULL ELSE current_date END,
      CASE WHEN coalesce(NEW.membership_status, 'active') = 'active' THEN 'active' ELSE 'expired' END
    )
    ON CONFLICT (membership_code) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.memberships m
SET status = 'expired',
    end_date = coalesce(m.end_date, current_date)
FROM public.profiles p
WHERE m.member_id = p.id
  AND p.approval_status = 'pending'
  AND m.status = 'active';

UPDATE public.profiles
SET membership_code = NULL
WHERE approval_status = 'pending';

UPDATE public.users_profile up
SET membership_code = NULL
FROM public.profiles p
WHERE p.id = up.id
  AND p.approval_status = 'pending';

CREATE OR REPLACE FUNCTION public.assign_active_membership(p_member_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_previous_id uuid;
  v_code text;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_top_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = '22023';
  END IF;

  IF v_profile.membership_code IS NOT NULL AND coalesce(v_profile.membership_status, 'active') = 'active' THEN
    RETURN v_profile.membership_code;
  END IF;

  UPDATE public.memberships
  SET status = 'expired',
      end_date = coalesce(end_date, current_date)
  WHERE member_id = p_member_id
    AND status = 'active';

  SELECT id INTO v_previous_id
  FROM public.memberships
  WHERE member_id = p_member_id
  ORDER BY created_at DESC, start_date DESC
  LIMIT 1;

  v_code := 'B' || nextval('public.membership_code_seq')::text;

  INSERT INTO public.memberships (
    member_id, membership_code, start_date, status, previous_membership_id, created_by
  )
  VALUES (p_member_id, v_code, current_date, 'active', v_previous_id, auth.uid());

  UPDATE public.profiles
  SET membership_code = v_code,
      membership_status = 'active'
  WHERE id = p_member_id;

  UPDATE public.users_profile
  SET membership_code = v_code,
      membership_status = 'active',
      is_suspended = false
  WHERE id = p_member_id;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_member(member_id uuid, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role text;
  current_profile public.profiles%ROWTYPE;
BEGIN
  SELECT role INTO admin_role
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;

  IF auth.role() <> 'service_role' AND admin_role NOT IN ('super_admin', 'global_admin') THEN
    RAISE EXCEPTION 'Only GHM admins can approve members' USING ERRCODE = '42501';
  END IF;

  IF new_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO current_profile FROM public.profiles WHERE id = member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = '22023';
  END IF;

  IF new_status = 'approved' THEN
    IF current_profile.approval_status = 'approved'
       AND current_profile.membership_code IS NOT NULL
       AND coalesce(current_profile.membership_status, 'active') = 'active' THEN
      RETURN;
    END IF;

    PERFORM public.assign_active_membership(member_id);

    UPDATE public.profiles
    SET approval_status = 'approved', updated_at = now()
    WHERE id = member_id;
  ELSE
    UPDATE public.memberships
    SET status = 'expired',
        end_date = coalesce(end_date, current_date)
    WHERE member_id = member_id
      AND status = 'active';

    UPDATE public.profiles
    SET approval_status = 'rejected',
        membership_code = NULL,
        updated_at = now()
    WHERE id = member_id;

    UPDATE public.users_profile
    SET membership_code = NULL,
        membership_status = 'inactive',
        is_suspended = true
    WHERE id = member_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_active_membership(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_active_membership(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.approve_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_member(uuid, text) TO authenticated, service_role;
