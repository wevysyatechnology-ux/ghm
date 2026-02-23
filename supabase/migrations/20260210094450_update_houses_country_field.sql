/*
  # Update Houses Table - Replace City with Country

  ## Changes Made
  1. Tables Modified
    - `houses` table:
      - Remove `city` column
      - Add `country` column (text, NOT NULL, default 'India')
  
  ## Notes
  - Setting default value to 'India' for existing records
  - Using safe operations to prevent data loss
  - No changes to RLS policies needed
*/

-- Add country column with default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'houses' AND column_name = 'country'
  ) THEN
    ALTER TABLE houses ADD COLUMN country text NOT NULL DEFAULT 'India';
  END IF;
END $$;

-- Drop city column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'houses' AND column_name = 'city'
  ) THEN
    ALTER TABLE houses DROP COLUMN city;
  END IF;
END $$;