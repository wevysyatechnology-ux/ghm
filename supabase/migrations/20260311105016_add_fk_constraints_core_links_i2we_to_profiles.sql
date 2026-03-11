/*
  # Add foreign key constraints for core_links and core_i2we to profiles

  ## Summary
  The core_links and core_i2we tables store user IDs (from_user_id, to_user_id,
  member_1_id, member_2_id) but had no foreign key constraints pointing to the
  profiles table. Supabase PostgREST requires FK constraints to resolve relational
  joins in .select() queries. Without them, the join fails and no data is returned.

  ## Changes
  - core_links: Add FK from from_user_id -> profiles(id)
  - core_links: Add FK from to_user_id -> profiles(id)
  - core_i2we: Add FK from member_1_id -> profiles(id)
  - core_i2we: Add FK from member_2_id -> profiles(id)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'core_links_from_user_id_fkey' AND table_name = 'core_links'
  ) THEN
    ALTER TABLE core_links
      ADD CONSTRAINT core_links_from_user_id_fkey
      FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'core_links_to_user_id_fkey' AND table_name = 'core_links'
  ) THEN
    ALTER TABLE core_links
      ADD CONSTRAINT core_links_to_user_id_fkey
      FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'core_i2we_member_1_id_fkey' AND table_name = 'core_i2we'
  ) THEN
    ALTER TABLE core_i2we
      ADD CONSTRAINT core_i2we_member_1_id_fkey
      FOREIGN KEY (member_1_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'core_i2we_member_2_id_fkey' AND table_name = 'core_i2we'
  ) THEN
    ALTER TABLE core_i2we
      ADD CONSTRAINT core_i2we_member_2_id_fkey
      FOREIGN KEY (member_2_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
