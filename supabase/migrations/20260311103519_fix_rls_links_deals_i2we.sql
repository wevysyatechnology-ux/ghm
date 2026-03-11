/*
  # Fix RLS Policies for Links, Deals, and I2WE Events Tables

  ## Summary
  Links, Deals aur I2WE Events pages pe data nahi dikh raha tha kyunki
  in tables pe authenticated users ke liye SELECT policies missing thi.
  Yeh migration teeno tables pe read/write policies add karta hai.

  ## Changes
  - `links` table pe authenticated users ke liye SELECT, INSERT policy
  - `deals` table pe authenticated users ke liye SELECT, INSERT policy
  - `i2we_events` table pe authenticated users ke liye SELECT, INSERT policy
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'links' AND policyname = 'Authenticated users can view links'
  ) THEN
    CREATE POLICY "Authenticated users can view links"
      ON links FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'links' AND policyname = 'Authenticated users can insert links'
  ) THEN
    CREATE POLICY "Authenticated users can insert links"
      ON links FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Authenticated users can view deals'
  ) THEN
    CREATE POLICY "Authenticated users can view deals"
      ON deals FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Authenticated users can insert deals'
  ) THEN
    CREATE POLICY "Authenticated users can insert deals"
      ON deals FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'i2we_events' AND policyname = 'Authenticated users can view i2we events'
  ) THEN
    CREATE POLICY "Authenticated users can view i2we events"
      ON i2we_events FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'i2we_events' AND policyname = 'Authenticated users can insert i2we events'
  ) THEN
    CREATE POLICY "Authenticated users can insert i2we events"
      ON i2we_events FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
