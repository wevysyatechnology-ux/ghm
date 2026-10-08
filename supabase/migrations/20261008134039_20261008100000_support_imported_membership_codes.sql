/*
# Support imported membership codes

1. New Function
- Adds `assign_membership_code(member_id, requested_code)` for approved member creation.
- Uses the spreadsheet code when one is supplied.
- Generates the next `B####` code from `membership_code_seq` when the spreadsheet cell is blank.
- Advances the sequence when an imported code is ahead of the current sequence, preventing future duplicates.

2. Updated Function
- `assign_active_membership(member_id)` now delegates to the same assignment logic with automatic numbering.
- Existing pending approval and direct-admin creation flows keep their current behavior.

3. Validation and Integrity
- Imported codes are normalized to uppercase and must match the `B` plus numeric format.
- A code already used by another current profile or membership history row is rejected.
- Assignment is serialized with a database advisory lock so simultaneous imports cannot allocate the same automatic code.
- Membership history, profile, and mobile profile are updated together by the server-side function.

4. Security
- Only top-level GHM admins or the trusted service role can call the assignment function.
- Functions remain `SECURITY DEFINER` with a fixed search path.
- No new tables, columns, policies, or public permissions are added.
*/

CREATE OR REPLACE FUNCTION public.assign_membership_code(
  p_member_id uuid,
  p_requested_code text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_previous_id uuid;
  v_code text;
  v_requested_code text;
  v_requested_number bigint;
  v_sequence_last bigint;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_top_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = '22023';
  END IF;

  v_requested_code := NULLIF(upper(btrim(p_requested_code)), '');
  IF v_requested_code IS NOT NULL THEN
    IF v_requested_code !~ '^B[0-9]+$' THEN
      RAISE EXCEPTION 'Membership code must use the B followed by numbers format' USING ERRCODE = '22023';
    END IF;
    v_requested_number := substring(v_requested_code FROM 2)::bigint;
  END IF;

  IF v_profile.membership_code IS NOT NULL
     AND coalesce(v_profile.membership_status, 'active') = 'active' THEN
    IF v_requested_code IS NULL OR v_requested_code = v_profile.membership_code THEN
      RETURN v_profile.membership_code;
    END IF;
    RAISE EXCEPTION 'Member already has a different membership code' USING ERRCODE = '23505';
  END IF;

  PERFORM pg_advisory_xact_lock(84729103);

  IF v_requested_code IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE membership_code = v_requested_code
        AND id <> p_member_id
    ) OR EXISTS (
      SELECT 1 FROM public.memberships
      WHERE membership_code = v_requested_code
    ) THEN
      RAISE EXCEPTION 'Membership code is already assigned' USING ERRCODE = '23505';
    END IF;

    v_code := v_requested_code;
    SELECT last_value INTO v_sequence_last FROM public.membership_code_seq;
    IF v_requested_number > v_sequence_last THEN
      PERFORM setval('public.membership_code_seq', v_requested_number, true);
    END IF;
  ELSE
    v_code := 'B' || nextval('public.membership_code_seq')::text;
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

CREATE OR REPLACE FUNCTION public.assign_active_membership(p_member_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.assign_membership_code(p_member_id, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_membership_code(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_membership_code(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.assign_active_membership(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_active_membership(uuid) TO authenticated, service_role;
