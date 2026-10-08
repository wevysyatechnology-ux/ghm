/*
# Add update_membership_code function for editing a member's code

## Purpose
Admins sometimes assign the wrong membership code to a member. This function
lets an admin change a member's existing code to a different code (or auto-
assign the next available one). It enforces uniqueness — if the requested code
is already assigned to another member, it raises a clear error.

## New Function
- `update_membership_code(p_member_id uuid, p_new_code text DEFAULT NULL)`:
  - SECURITY DEFINER, search_path = public
  - Only callable by top admins (super_admin, global_admin, collaborator)
  - Validates the member exists
  - If p_new_code is NULL → auto-assigns the next sequence value
  - If p_new_code is provided → validates B#### format, checks it's not already
    assigned to a different member (in profiles OR memberships), advances the
    sequence past it if needed
  - Updates the member's code in profiles, users_profile, and the active
    memberships row
  - Returns the new code

## Security
- SECURITY DEFINER with locked search_path
- Auth check: only top admins can call
- Advisory lock to serialize concurrent code changes
- Grants: EXECUTE to authenticated and service_role
*/

CREATE OR REPLACE FUNCTION public.update_membership_code(
  p_member_id uuid,
  p_new_code text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_code text;
  v_new_code text;
  v_requested_number bigint;
  v_sequence_last bigint;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_top_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT membership_code INTO v_current_code
  FROM public.profiles
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = '22023';
  END IF;

  v_new_code := NULLIF(upper(btrim(p_new_code)), '');

  IF v_new_code IS NOT NULL THEN
    IF v_new_code !~ '^B[0-9]+$' THEN
      RAISE EXCEPTION 'Membership code must use the B followed by numbers format' USING ERRCODE = '22023';
    END IF;
    v_requested_number := substring(v_new_code FROM 2)::bigint;
  END IF;

  -- If the code hasn't changed, just return the current one
  IF v_new_code IS NOT NULL AND v_new_code = v_current_code THEN
    RETURN v_current_code;
  END IF;

  PERFORM pg_advisory_xact_lock(84729103);

  IF v_new_code IS NOT NULL THEN
    -- Check uniqueness against other profiles
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE membership_code = v_new_code
      AND id <> p_member_id
    ) THEN
      RAISE EXCEPTION 'Membership code is already assigned to another member' USING ERRCODE = '23505';
    END IF;

    -- Check uniqueness against memberships table (historical terms)
    IF EXISTS (
      SELECT 1 FROM public.memberships
      WHERE membership_code = v_new_code
      AND member_id <> p_member_id
    ) THEN
      RAISE EXCEPTION 'Membership code is already assigned to another member' USING ERRCODE = '23505';
    END IF;

    -- Advance sequence past this code if needed
    SELECT last_value INTO v_sequence_last FROM public.membership_code_seq;
    IF v_requested_number > v_sequence_last THEN
      PERFORM setval('public.membership_code_seq', v_requested_number, true);
    END IF;
  ELSE
    -- Auto-assign next available code
    v_new_code := 'B' || nextval('public.membership_code_seq')::text;
  END IF;

  -- Update profiles
  UPDATE public.profiles
  SET membership_code = v_new_code
  WHERE id = p_member_id;

  -- Update users_profile
  UPDATE public.users_profile
  SET membership_code = v_new_code
  WHERE id = p_member_id;

  -- Update the active membership term's code
  UPDATE public.memberships
  SET membership_code = v_new_code
  WHERE member_id = p_member_id
  AND status = 'active';

  RETURN v_new_code;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_membership_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_membership_code(uuid, text) TO service_role;
