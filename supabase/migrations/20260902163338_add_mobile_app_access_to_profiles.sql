/*
# Add Mobile App Access column to profiles

1. Changes
- Add `mobile_app_access` column to `profiles` table.
- Type: text, default 'enabled'.
- Allowed values: 'enabled', 'disabled', 'pending'.
- This controls whether a member can access the mobile app.

2. Security
- No RLS policy changes needed — existing policies on profiles already cover the new column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mobile_app_access'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mobile_app_access text DEFAULT 'enabled';
  END IF;
END $$;
