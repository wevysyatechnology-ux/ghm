/*
  # Fix Remaining RLS Policy Performance Issues

  1. Purpose
    - Optimize remaining tables with auth function caching
    - Fix multiple permissive policies on members table
    - Ensures optimal query performance at scale

  2. Tables Updated
    - users_profile
    - virtual_memberships
    - core_links
    - core_deals
    - core_i2we
    - channel_posts
    - deal_participants
    - members

  3. Performance Impact
    - Auth functions evaluated once per query instead of per row
    - Reduces database load and improves query execution time
*/

-- ==========================================
-- USERS_PROFILE TABLE
-- ==========================================

DROP POLICY IF EXISTS "Users can read own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON users_profile;

CREATE POLICY "Users can read own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ==========================================
-- VIRTUAL_MEMBERSHIPS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Users can read own virtual memberships" ON virtual_memberships;

CREATE POLICY "Users can read own virtual memberships"
  ON virtual_memberships FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ==========================================
-- CORE_LINKS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Users can create links" ON core_links;
DROP POLICY IF EXISTS "Users can update their links" ON core_links;

CREATE POLICY "Users can create links"
  ON core_links FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = from_user_id);

CREATE POLICY "Users can update their links"
  ON core_links FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = from_user_id)
  WITH CHECK ((select auth.uid()) = from_user_id);

-- ==========================================
-- CORE_DEALS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Users can create deals" ON core_deals;
DROP POLICY IF EXISTS "Users can update their deals" ON core_deals;

CREATE POLICY "Users can create deals"
  ON core_deals FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = creator_id);

CREATE POLICY "Users can update their deals"
  ON core_deals FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = creator_id)
  WITH CHECK ((select auth.uid()) = creator_id);

-- ==========================================
-- CORE_I2WE TABLE
-- ==========================================

DROP POLICY IF EXISTS "Members can read their I2WE meetings" ON core_i2we;
DROP POLICY IF EXISTS "Members can create I2WE meetings" ON core_i2we;
DROP POLICY IF EXISTS "Members can update their I2WE meetings" ON core_i2we;

CREATE POLICY "Members can read their I2WE meetings"
  ON core_i2we FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = member_1_id
    OR (select auth.uid()) = member_2_id
  );

CREATE POLICY "Members can create I2WE meetings"
  ON core_i2we FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = member_1_id
    OR (select auth.uid()) = member_2_id
  );

CREATE POLICY "Members can update their I2WE meetings"
  ON core_i2we FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = member_1_id
    OR (select auth.uid()) = member_2_id
  )
  WITH CHECK (
    (select auth.uid()) = member_1_id
    OR (select auth.uid()) = member_2_id
  );

-- ==========================================
-- CHANNEL_POSTS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Users can create posts" ON channel_posts;
DROP POLICY IF EXISTS "Users can update their posts" ON channel_posts;
DROP POLICY IF EXISTS "Users can delete their posts" ON channel_posts;

CREATE POLICY "Users can create posts"
  ON channel_posts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their posts"
  ON channel_posts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their posts"
  ON channel_posts FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ==========================================
-- DEAL_PARTICIPANTS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Users can read participants of their deals" ON deal_participants;
DROP POLICY IF EXISTS "Users can join deals" ON deal_participants;
DROP POLICY IF EXISTS "Users can leave deals" ON deal_participants;

CREATE POLICY "Users can read participants of their deals"
  ON deal_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core_deals
      WHERE core_deals.id = deal_participants.deal_id
      AND core_deals.creator_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can join deals"
  ON deal_participants FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can leave deals"
  ON deal_participants FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ==========================================
-- MEMBERS TABLE - Fix Multiple Permissive Policies
-- ==========================================

-- Drop both existing policies
DROP POLICY IF EXISTS "Admins can manage members" ON members;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON members;

-- Create consolidated SELECT policy (all authenticated users can read)
CREATE POLICY "Enable read for authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (true);

-- Create separate INSERT policy for admins
CREATE POLICY "Admins can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );

-- Create separate UPDATE policy for admins
CREATE POLICY "Admins can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );

-- Create separate DELETE policy for admins
CREATE POLICY "Admins can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );