/*
# Enforce House Admin Data Isolation via RLS

## Problem
- House admins could see all data across all houses (members, deals, links, I2WE events, attendance, events).
- SELECT policies used `USING (true)` for all authenticated users, with no house-scoping.

## Changes

### 1. Helper Functions
- `get_my_house_id()` — returns the caller's house_id from profiles (fixed, stable, secure).
- `get_my_zone()` — returns the caller's zone from profiles (new).
- `is_top_admin()` — true if caller is super_admin, global_admin, or collaborator.
- `is_zone_admin()` — true if caller is zone_admin.
- `is_house_admin()` — true if caller is house_admin.

### 2. SELECT Policy Replacements
Tables with `house_id` column:
- `profiles` — house_admin sees only members in their house
- `members` — house_admin sees only members in their house
- `deals` — house_admin sees only deals in their house
- `links` — house_admin sees only links in their house
- `events` — house_admin sees only events in their house (zone_admin sees events in their zone)

Tables without house_id but with member relationship:
- `i2we_events` — house_admin sees only I2WE where member_id is in their house
- `attendance` — house_admin sees only attendance where member_id is in their house
- `core_links` — house_admin sees only links where from/to user is in their house (also has house_id column)
- `core_deals` — house_admin sees only deals where from/to member is in their house (also has house_id column)
- `core_i2we` — house_admin sees only I2WE where member_1 or member_2 is in their house (also has house_id column)
- `event_attendance` — house_admin sees only attendance for members in their house
- `attendance_records` — house_admin sees only records for users in their house
- `core_house_members` — house_admin sees only members in their house

### 3. Role Hierarchy
- super_admin, global_admin, collaborator: see all data (unchanged)
- zone_admin: sees events in their zone; sees members in their zone
- house_admin: sees only data in their house
- member: sees only their own data

### 4. Security
- All functions use SECURITY DEFINER with fixed search_path
- Functions revoked from anon/public
*/

-- ============================================================
-- Helper Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_zone()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT zone FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_zone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_zone() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_house_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT house_id FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_house_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_house_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_top_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'global_admin', 'collaborator')
  );
$$;

REVOKE ALL ON FUNCTION public.is_top_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_top_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_zone_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'zone_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_zone_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_zone_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_house_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'house_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_house_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_house_admin() TO authenticated;

-- ============================================================
-- profiles: house_admin sees only members in own house
-- ============================================================
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;

CREATE POLICY "profiles_select_scoped"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR is_top_admin()
  OR (is_zone_admin() AND zone = get_my_zone())
  OR (is_house_admin() AND house_id = get_my_house_id())
);

-- ============================================================
-- members table: house_admin sees only members in own house
-- ============================================================
DROP POLICY IF EXISTS "All authenticated users can view members" ON public.members;

CREATE POLICY "members_select_scoped"
ON public.members FOR SELECT
TO authenticated
USING (
  is_top_admin()
  OR (is_zone_admin() AND profile_id IN (SELECT id FROM public.profiles WHERE zone = get_my_zone()))
  OR (is_house_admin() AND house_id = get_my_house_id())
  OR profile_id = auth.uid()
);

-- ============================================================
-- deals table: house_admin sees only deals in own house
-- ============================================================
DROP POLICY IF EXISTS "All authenticated users can view deals" ON public.deals;

CREATE POLICY "deals_select_scoped"
ON public.deals FOR SELECT
TO authenticated
USING (
  is_top_admin()
  OR (is_house_admin() AND house_id = get_my_house_id())
  OR created_by = auth.uid()
);

-- ============================================================
-- links table: house_admin sees only links in own house
-- ============================================================
DROP POLICY IF EXISTS "All authenticated users can view links" ON public.links;

CREATE POLICY "links_select_scoped"
ON public.links FOR SELECT
TO authenticated
USING (
  is_top_admin()
  OR (is_house_admin() AND house_id = get_my_house_id())
  OR from_member_id = auth.uid()
  OR to_member_id = auth.uid()
);

-- ============================================================
-- i2we_events table: no house_id column, scope via member_id -> profiles
-- ============================================================
DROP POLICY IF EXISTS "All authenticated users can view i2we events" ON public.i2we_events;

CREATE POLICY "i2we_select_scoped"
ON public.i2we_events FOR SELECT
TO authenticated
USING (
  is_top_admin()
  OR (is_house_admin() AND member_id IN (SELECT id FROM public.profiles WHERE house_id = get_my_house_id()))
  OR member_id = auth.uid()
  OR created_by = auth.uid()
);

-- ============================================================
-- events table: house_admin sees only events in own house; zone_admin sees events in own zone
-- ============================================================
DROP POLICY IF EXISTS "events_select" ON public.events;

CREATE POLICY "events_select_scoped"
ON public.events FOR SELECT
TO authenticated
USING (
  is_top_admin()
  OR (is_zone_admin() AND zone = get_my_zone())
  OR (is_house_admin() AND house_id = get_my_house_id())
  OR created_by = auth.uid()
);

-- ============================================================
-- attendance table: no house_id, scope via member_id -> profiles
-- ============================================================
DROP POLICY IF EXISTS "All authenticated users can view attendance" ON public.attendance;

CREATE POLICY "attendance_select_scoped"
ON public.attendance FOR SELECT
TO authenticated
USING (
  is_top_admin()
  OR (is_house_admin() AND member_id IN (SELECT id FROM public.profiles WHERE house_id = get_my_house_id()))
  OR member_id = auth.uid()
);

-- ============================================================
-- core_links: has house_id column, also scope via from/to user
-- ============================================================
DROP POLICY IF EXISTS "core_links_select" ON public.core_links;

CREATE POLICY "core_links_select_scoped"
ON public.core_links FOR SELECT
TO authenticated
USING (
  from_user_id = auth.uid()
  OR to_user_id = auth.uid()
  OR is_top_admin()
  OR (is_house_admin() AND house_id = get_my_house_id())
);

-- ============================================================
-- core_deals: has house_id column
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view deals" ON public.core_deals;

CREATE POLICY "core_deals_select_scoped"
ON public.core_deals FOR SELECT
TO authenticated
USING (
  is_top_admin()
  OR (is_house_admin() AND house_id = get_my_house_id())
  OR from_member_id = auth.uid()
  OR to_member_id = auth.uid()
);

-- ============================================================
-- core_i2we: has house_id column
-- ============================================================
DROP POLICY IF EXISTS "core_i2we_select" ON public.core_i2we;

CREATE POLICY "core_i2we_select_scoped"
ON public.core_i2we FOR SELECT
TO authenticated
USING (
  member_1_id = auth.uid()
  OR member_2_id = auth.uid()
  OR is_top_admin()
  OR (is_house_admin() AND house_id = get_my_house_id())
);

-- ============================================================
-- event_attendance: house_admin sees only attendance for members in own house
-- ============================================================
DROP POLICY IF EXISTS "Admins can read all event attendance" ON public.event_attendance;
DROP POLICY IF EXISTS "Members can read own attendance" ON public.event_attendance;

CREATE POLICY "event_attendance_select_scoped"
ON public.event_attendance FOR SELECT
TO authenticated
USING (
  member_id = auth.uid()
  OR is_top_admin()
  OR (is_zone_admin() AND member_id IN (SELECT id FROM public.profiles WHERE zone = get_my_zone()))
  OR (is_house_admin() AND member_id IN (SELECT id FROM public.profiles WHERE house_id = get_my_house_id()))
);

-- ============================================================
-- attendance_records: house_admin sees only records for users in own house
-- ============================================================
DROP POLICY IF EXISTS "Users can view own attendance records" ON public.attendance_records;

CREATE POLICY "attendance_records_select_scoped"
ON public.attendance_records FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_top_admin()
  OR (is_house_admin() AND user_id IN (SELECT id FROM public.profiles WHERE house_id = get_my_house_id()))
);

-- ============================================================
-- core_house_members: house_admin sees only members in own house
-- ============================================================
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.core_house_members;

CREATE POLICY "core_house_members_select_scoped"
ON public.core_house_members FOR SELECT
TO authenticated
USING (
  is_top_admin()
  OR (is_house_admin() AND house_id = get_my_house_id())
  OR user_id = auth.uid()
);
