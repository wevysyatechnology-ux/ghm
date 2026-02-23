/*
  # Optimize RLS Policies with Auth Function Caching - Simplified

  1. Purpose
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Performance Impact
    - Auth functions are evaluated once per query instead of per row
    - Reduces database load and query execution time

  3. Tables Updated
    - profiles (main app tables)
    - houses
    - members
    - links
    - deals
    - i2we_events
    - attendance

  4. Security
    - No security changes, only performance optimization
    - All policies maintain their original security rules
*/

-- ==========================================
-- PROFILES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ==========================================
-- HOUSES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can insert houses" ON houses;
DROP POLICY IF EXISTS "Admins can update houses" ON houses;

CREATE POLICY "Admins can insert houses"
  ON houses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update houses"
  ON houses FOR UPDATE
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
-- MEMBERS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage members" ON members;

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
-- LINKS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users can create links" ON links;
DROP POLICY IF EXISTS "Enable update for own links" ON links;
DROP POLICY IF EXISTS "Enable delete for own links" ON links;

CREATE POLICY "Authenticated users can create links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Enable update for own links"
  ON links FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Enable delete for own links"
  ON links FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = created_by);

-- ==========================================
-- DEALS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users can create deals" ON deals;
DROP POLICY IF EXISTS "Enable update for own deals" ON deals;
DROP POLICY IF EXISTS "Enable delete for own deals" ON deals;

CREATE POLICY "Authenticated users can create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Enable update for own deals"
  ON deals FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Enable delete for own deals"
  ON deals FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = created_by);

-- ==========================================
-- I2WE_EVENTS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users can create i2we events" ON i2we_events;
DROP POLICY IF EXISTS "Enable update for own events" ON i2we_events;
DROP POLICY IF EXISTS "Enable delete for own events" ON i2we_events;

CREATE POLICY "Authenticated users can create i2we events"
  ON i2we_events FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Enable update for own events"
  ON i2we_events FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Enable delete for own events"
  ON i2we_events FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = created_by);

-- ==========================================
-- ATTENDANCE TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can mark attendance" ON attendance;

CREATE POLICY "Admins can mark attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'super_admin')
    )
  );