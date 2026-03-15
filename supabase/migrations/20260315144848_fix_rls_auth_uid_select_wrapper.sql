/*
  # Fix RLS Auth Initialization Plan

  ## Summary
  Replaces bare `auth.uid()` calls with `(select auth.uid())` in all RLS policies
  to avoid per-row re-evaluation, improving query performance at scale.

  ## Tables Fixed
  - profiles: Users can view own profile, Users can update own profile, Admins can view all profiles,
    Admins can update any profile, Admins can delete profiles, profiles_select_own,
    profiles_update_own, Authenticated users can insert own profile, profiles_insert_signup
  - core_links: core_links_select, core_links_insert, core_links_update
  - core_i2we: core_i2we_select, core_i2we_insert, core_i2we_update
  - notifications: view, update, delete
  - push_tokens: view, insert, update, delete
  - notification_preferences: view, insert, update
  - houses: insert, update, delete admin policies
  - members: insert, update, delete admin policies
  - deals: Authenticated users can create deals
  - i2we_events: Authenticated users can create i2we events
  - links: Authenticated users can create links
  - web_push_subscriptions: view, insert, update, delete
  - users_profile: view, insert, update
  - attendance: Admins can mark attendance
  - events: insert, update, delete
*/

-- ============================================================
-- profiles
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = (select auth.uid()))
  WITH CHECK (auth_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'zone_admin'::text, 'house_admin'::text]));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text]));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text]));

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- ============================================================
-- core_links
-- ============================================================
DROP POLICY IF EXISTS "core_links_select" ON public.core_links;
CREATE POLICY "core_links_select"
  ON public.core_links FOR SELECT
  TO authenticated
  USING (
    ((select auth.uid()) = from_user_id) OR
    ((select auth.uid()) = to_user_id) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text]))) OR
    (EXISTS (SELECT 1 FROM profiles ha WHERE ha.id = (select auth.uid()) AND ha.role = 'house_admin'::text AND (
      (EXISTS (SELECT 1 FROM profiles sender WHERE sender.id = core_links.from_user_id AND sender.house_id = ha.house_id)) OR
      (EXISTS (SELECT 1 FROM profiles receiver WHERE receiver.id = core_links.to_user_id AND receiver.house_id = ha.house_id))
    )))
  );

DROP POLICY IF EXISTS "core_links_insert" ON public.core_links;
CREATE POLICY "core_links_insert"
  ON public.core_links FOR INSERT
  TO authenticated
  WITH CHECK (
    ((select auth.uid()) = from_user_id) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text])))
  );

DROP POLICY IF EXISTS "core_links_update" ON public.core_links;
CREATE POLICY "core_links_update"
  ON public.core_links FOR UPDATE
  TO authenticated
  USING (
    ((select auth.uid()) = from_user_id) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text])))
  )
  WITH CHECK (
    ((select auth.uid()) = from_user_id) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text])))
  );

-- ============================================================
-- core_i2we
-- ============================================================
DROP POLICY IF EXISTS "core_i2we_select" ON public.core_i2we;
CREATE POLICY "core_i2we_select"
  ON public.core_i2we FOR SELECT
  TO authenticated
  USING (
    ((select auth.uid()) = member_1_id) OR
    ((select auth.uid()) = member_2_id) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text]))) OR
    (EXISTS (SELECT 1 FROM profiles ha WHERE ha.id = (select auth.uid()) AND ha.role = 'house_admin'::text AND (
      (EXISTS (SELECT 1 FROM profiles m1 WHERE m1.id = core_i2we.member_1_id AND m1.house_id = ha.house_id)) OR
      (EXISTS (SELECT 1 FROM profiles m2 WHERE m2.id = core_i2we.member_2_id AND m2.house_id = ha.house_id))
    )))
  );

DROP POLICY IF EXISTS "core_i2we_insert" ON public.core_i2we;
CREATE POLICY "core_i2we_insert"
  ON public.core_i2we FOR INSERT
  TO authenticated
  WITH CHECK (
    ((select auth.uid()) = member_1_id) OR
    ((select auth.uid()) = member_2_id) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text])))
  );

DROP POLICY IF EXISTS "core_i2we_update" ON public.core_i2we;
CREATE POLICY "core_i2we_update"
  ON public.core_i2we FOR UPDATE
  TO authenticated
  USING (
    ((select auth.uid()) = member_1_id) OR
    ((select auth.uid()) = member_2_id) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text])))
  )
  WITH CHECK (
    ((select auth.uid()) = member_1_id) OR
    ((select auth.uid()) = member_2_id) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text])))
  );

-- ============================================================
-- notifications
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- push_tokens
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can view their own push tokens"
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can insert their own push tokens"
  ON public.push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can update their own push tokens"
  ON public.push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public.push_tokens;
CREATE POLICY "Users can delete their own push tokens"
  ON public.push_tokens FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- notification_preferences
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- houses
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert houses" ON public.houses;
CREATE POLICY "Admins can insert houses"
  ON public.houses FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text]));

DROP POLICY IF EXISTS "Admins can update houses" ON public.houses;
CREATE POLICY "Admins can update houses"
  ON public.houses FOR UPDATE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text]))
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text]));

DROP POLICY IF EXISTS "Admins can delete houses" ON public.houses;
CREATE POLICY "Admins can delete houses"
  ON public.houses FOR DELETE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text]));

-- ============================================================
-- members
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert members" ON public.members;
CREATE POLICY "Admins can insert members"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]));

DROP POLICY IF EXISTS "Admins can update members" ON public.members;
CREATE POLICY "Admins can update members"
  ON public.members FOR UPDATE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]))
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]));

DROP POLICY IF EXISTS "Admins can delete members" ON public.members;
CREATE POLICY "Admins can delete members"
  ON public.members FOR DELETE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]));

-- ============================================================
-- deals
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create deals" ON public.deals;
CREATE POLICY "Authenticated users can create deals"
  ON public.deals FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

-- ============================================================
-- i2we_events
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create i2we events" ON public.i2we_events;
CREATE POLICY "Authenticated users can create i2we events"
  ON public.i2we_events FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

-- ============================================================
-- links
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create links" ON public.links;
CREATE POLICY "Authenticated users can create links"
  ON public.links FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

-- ============================================================
-- web_push_subscriptions
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own web push subscriptions" ON public.web_push_subscriptions;
CREATE POLICY "Users can view their own web push subscriptions"
  ON public.web_push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own web push subscriptions" ON public.web_push_subscriptions;
CREATE POLICY "Users can insert their own web push subscriptions"
  ON public.web_push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own web push subscriptions" ON public.web_push_subscriptions;
CREATE POLICY "Users can update their own web push subscriptions"
  ON public.web_push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own web push subscriptions" ON public.web_push_subscriptions;
CREATE POLICY "Users can delete their own web push subscriptions"
  ON public.web_push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- users_profile (uses id as PK which equals auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Users can create own profile" ON public.users_profile;
CREATE POLICY "Users can create own profile"
  ON public.users_profile FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own profile" ON public.users_profile;
CREATE POLICY "Users can read own profile"
  ON public.users_profile FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profile;
CREATE POLICY "Users can update own profile"
  ON public.users_profile FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- ============================================================
-- attendance
-- ============================================================
DROP POLICY IF EXISTS "Admins can mark attendance" ON public.attendance;
CREATE POLICY "Admins can mark attendance"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]));

-- ============================================================
-- events
-- ============================================================
DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text]))
  );

DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    ((select auth.uid()) = created_by) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text])))
  )
  WITH CHECK (
    ((select auth.uid()) = created_by) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text])))
  );

DROP POLICY IF EXISTS "events_delete" ON public.events;
CREATE POLICY "events_delete"
  ON public.events FOR DELETE
  TO authenticated
  USING (
    ((select auth.uid()) = created_by) OR
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text])))
  );
