/*
  # Add membership_status column to profiles

  ## Summary
  Adds a `membership_status` field to the profiles table to track GHM membership standing.

  ## Changes
  - New column `membership_status` on `profiles` table
    - Type: text
    - Allowed values: 'active', 'resigned', 'expired', 'terminated'
    - Default: 'active'

  ## Notes
  - Existing members will default to 'active'
  - A CHECK constraint ensures only valid statuses can be stored
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'membership_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN membership_status text NOT NULL DEFAULT 'active'
      CHECK (membership_status IN ('active', 'resigned', 'expired', 'terminated'));
  END IF;
END $$;
