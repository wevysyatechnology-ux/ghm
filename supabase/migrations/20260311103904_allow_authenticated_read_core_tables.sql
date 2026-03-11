/*
  # Add RLS Policies for core_links, core_deals, core_i2we

  ## Summary
  Links, Deals, I2WE pages mein data nahi dikh raha tha kyunki app
  wrong tables query kar rahi thi (links/deals/i2we_events) jabke actual
  data core_links, core_deals, core_i2we tables mein hai.
  Yeh migration in core tables pe authenticated users ke liye SELECT policy add karta hai.

  ## Changes
  - `core_links` pe authenticated SELECT policy
  - `core_deals` pe authenticated SELECT policy
  - `core_i2we` pe authenticated SELECT policy
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'core_links' AND policyname = 'Authenticated users can view core links'
  ) THEN
    CREATE POLICY "Authenticated users can view core links"
      ON core_links FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'core_links' AND policyname = 'Authenticated users can insert core links'
  ) THEN
    CREATE POLICY "Authenticated users can insert core links"
      ON core_links FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'core_deals' AND policyname = 'Authenticated users can view core deals'
  ) THEN
    CREATE POLICY "Authenticated users can view core deals"
      ON core_deals FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'core_deals' AND policyname = 'Authenticated users can insert core deals'
  ) THEN
    CREATE POLICY "Authenticated users can insert core deals"
      ON core_deals FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'core_i2we' AND policyname = 'Authenticated users can view core i2we'
  ) THEN
    CREATE POLICY "Authenticated users can view core i2we"
      ON core_i2we FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'core_i2we' AND policyname = 'Authenticated users can insert core i2we'
  ) THEN
    CREATE POLICY "Authenticated users can insert core i2we"
      ON core_i2we FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
