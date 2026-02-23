/*
  # Consolidate Multiple Permissive Policies

  1. Purpose
    - Combine multiple permissive SELECT policies into single policies
    - Improves query planning and performance
    - Reduces policy evaluation overhead

  2. Tables Updated
    - profiles: Combine "Users can view own profile" and "Authenticated users can view all profiles"
    - members: Combine "Admins can manage members" and "Authenticated users can view members"
    - core_deals (if exists): Consolidate deal access policies
    - core_house_members (if exists): Consolidate member access policies
    - core_links (if exists): Consolidate link access policies
    - core_memberships (if exists): Consolidate membership access policies

  3. Security
    - Maintains same access logic as before
    - Uses OR conditions to combine multiple checks
*/

-- ==========================================
-- PROFILES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

-- Single consolidated policy for SELECT
CREATE POLICY "Enable read for authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- ==========================================
-- MEMBERS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage members" ON members;
DROP POLICY IF EXISTS "Authenticated users can view members" ON members;

-- Consolidated SELECT policy
CREATE POLICY "Enable read for authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (true);

-- Admin management policies (already exist from previous migration)
CREATE POLICY "Admins can manage members"
  ON members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ==========================================
-- CORE_DEALS TABLE (if exists)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'core_deals' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can read deals they created" ON core_deals;
    DROP POLICY IF EXISTS "House members can read house deals" ON core_deals;
    DROP POLICY IF EXISTS "Users can read WeVysya deals" ON core_deals;

    -- Single consolidated SELECT policy
    CREATE POLICY "Enable read for authenticated users"
      ON core_deals FOR SELECT
      TO authenticated
      USING (
        (select auth.uid()) = creator_id
        OR EXISTS (
          SELECT 1 FROM core_house_members
          WHERE core_house_members.user_id = (select auth.uid())
          AND core_house_members.house_id = core_deals.house_id
        )
        OR deal_type = 'wevysya_deal'
      );
  END IF;
END $$;

-- ==========================================
-- CORE_HOUSE_MEMBERS TABLE (if exists)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'core_house_members' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "House members can read their house membership" ON core_house_members;
    DROP POLICY IF EXISTS "Authenticated users can view all house memberships" ON core_house_members;

    -- Single consolidated SELECT policy
    CREATE POLICY "Enable read for authenticated users"
      ON core_house_members FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ==========================================
-- CORE_LINKS TABLE (if exists)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'core_links' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can read links they created" ON core_links;
    DROP POLICY IF EXISTS "Users can read links sent to them" ON core_links;

    -- Single consolidated SELECT policy
    CREATE POLICY "Enable read for authenticated users"
      ON core_links FOR SELECT
      TO authenticated
      USING (
        (select auth.uid()) = from_user_id
        OR (select auth.uid()) = to_user_id
      );
  END IF;
END $$;

-- ==========================================
-- CORE_MEMBERSHIPS TABLE (if exists)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'core_memberships' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can read own memberships" ON core_memberships;
    DROP POLICY IF EXISTS "Authenticated users can view all memberships" ON core_memberships;

    -- Single consolidated SELECT policy
    CREATE POLICY "Enable read for authenticated users"
      ON core_memberships FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;