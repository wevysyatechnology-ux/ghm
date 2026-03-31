/*
  # Add 'inactive' membership status

  1. Changes
    - Drops the existing check constraint on profiles.membership_status
    - Recreates it with 'inactive' added as a valid value
    - Same change applied to users_profile.membership_status if it has a similar constraint
*/

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_membership_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_membership_status_check
  CHECK (membership_status = ANY (ARRAY['active'::text, 'inactive'::text, 'resigned'::text, 'expired'::text, 'terminated'::text]));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_profile_membership_status_check'
      AND table_name = 'users_profile'
  ) THEN
    ALTER TABLE public.users_profile DROP CONSTRAINT users_profile_membership_status_check;
    ALTER TABLE public.users_profile ADD CONSTRAINT users_profile_membership_status_check
      CHECK (membership_status = ANY (ARRAY['active'::text, 'inactive'::text, 'resigned'::text, 'expired'::text, 'terminated'::text]));
  END IF;
END $$;
