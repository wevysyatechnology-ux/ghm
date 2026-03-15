-- =============================================================
-- FIX: core_links AND core_i2we RLS policies
--
-- TWO apps share this database:
--   • ghm_mobile_app  – regular authenticated members
--   • ghm_web         – admin panel (super_admin, global_admin, house_admin)
--
-- Rules
--   Mobile members  : SELECT / INSERT / UPDATE only their own links (unchanged)
--   super_admin
--   global_admin    : SELECT all links; INSERT for any from_user; UPDATE any link
--   house_admin     : SELECT links where sender OR receiver is in their house (read-only)
-- =============================================================

-- ── Fix broken FK on core_links.house_id ─────────────────────
-- core_links.house_id was wrongly pointing to core_houses.
-- profiles.house_id → houses (the real table). Fix core_links to match.
ALTER TABLE "public"."core_links"
  DROP CONSTRAINT IF EXISTS "core_links_house_id_fkey";

ALTER TABLE "public"."core_links"
  ADD CONSTRAINT "core_links_house_id_fkey"
  FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id") ON DELETE SET NULL;

-- ── Drop old policies (all possible names) ───────────────────
DROP POLICY IF EXISTS "Enable read for authenticated users" ON "public"."core_links";
DROP POLICY IF EXISTS "Users can create links"              ON "public"."core_links";
DROP POLICY IF EXISTS "Users can update their links"        ON "public"."core_links";
DROP POLICY IF EXISTS "Read core_links"                     ON "public"."core_links";
DROP POLICY IF EXISTS "core_links_select"                   ON "public"."core_links";
DROP POLICY IF EXISTS "core_links_insert"                   ON "public"."core_links";
DROP POLICY IF EXISTS "core_links_update"                   ON "public"."core_links";

-- ── SELECT ────────────────────────────────────────────────────
-- Mobile members see only their own links.
-- super_admin / global_admin see all links.
-- house_admin sees links where the sender OR receiver belongs to their house.
CREATE POLICY "core_links_select"
  ON "public"."core_links"
  FOR SELECT
  TO "authenticated"
  USING (
    -- 1. Mobile members: own links (existing mobile-app behaviour – DO NOT CHANGE)
    auth.uid() = from_user_id
    OR auth.uid() = to_user_id

    -- 2. Super / Global admins: see everything
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'global_admin')
    )

    -- 3. House admin: see links where either party is in their house
    OR EXISTS (
      SELECT 1 FROM public.profiles ha
      WHERE ha.id = auth.uid()
        AND ha.role = 'house_admin'
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles sender
            WHERE sender.id = from_user_id
              AND sender.house_id = ha.house_id
          )
          OR
          EXISTS (
            SELECT 1 FROM public.profiles receiver
            WHERE receiver.id = to_user_id
              AND receiver.house_id = ha.house_id
          )
        )
    )
  );

-- ── INSERT ────────────────────────────────────────────────────
-- Mobile members can only create links as themselves (from_user_id = own uid).
-- super_admin / global_admin can create links on behalf of any member.
-- house_admin cannot submit links for others (read-only role for links).
CREATE POLICY "core_links_insert"
  ON "public"."core_links"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (
    -- 1. Mobile members: must be the sender (existing behaviour – DO NOT CHANGE)
    auth.uid() = from_user_id

    -- 2. Super / Global admins: can insert for any from_user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'global_admin')
    )
  );

-- ── UPDATE ────────────────────────────────────────────────────
-- Mobile members can update only links they sent (existing behaviour – DO NOT CHANGE).
-- super_admin / global_admin can update any link.
CREATE POLICY "core_links_update"
  ON "public"."core_links"
  FOR UPDATE
  TO "authenticated"
  USING (
    -- 1. Mobile members: own sent links
    auth.uid() = from_user_id

    -- 2. Super / Global admins: any link
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'global_admin')
    )
  )
  WITH CHECK (
    auth.uid() = from_user_id

    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'global_admin')
    )
  );

-- =============================================================
-- core_i2we RLS policies
-- Rules mirror core_links:
--   Mobile members  : own meetings only (unchanged)
--   super_admin / global_admin : all rows, can insert for any member
--   house_admin     : meetings where either member is in their house (read-only)
-- =============================================================

-- ── Drop old policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "Members can read their I2WE meetings"   ON "public"."core_i2we";
DROP POLICY IF EXISTS "Members can create I2WE meetings"       ON "public"."core_i2we";
DROP POLICY IF EXISTS "Members can update their I2WE meetings" ON "public"."core_i2we";
DROP POLICY IF EXISTS "core_i2we_select"                       ON "public"."core_i2we";
DROP POLICY IF EXISTS "core_i2we_insert"                       ON "public"."core_i2we";
DROP POLICY IF EXISTS "core_i2we_update"                       ON "public"."core_i2we";

-- ── SELECT ────────────────────────────────────────────────────
CREATE POLICY "core_i2we_select"
  ON "public"."core_i2we"
  FOR SELECT
  TO "authenticated"
  USING (
    -- 1. Mobile members: own meetings
    auth.uid() = member_1_id
    OR auth.uid() = member_2_id

    -- 2. Super / Global admins: all
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'global_admin')
    )

    -- 3. House admin: meetings where either member is in their house
    OR EXISTS (
      SELECT 1 FROM public.profiles ha
      WHERE ha.id = auth.uid()
        AND ha.role = 'house_admin'
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles m1
            WHERE m1.id = member_1_id
              AND m1.house_id = ha.house_id
          )
          OR
          EXISTS (
            SELECT 1 FROM public.profiles m2
            WHERE m2.id = member_2_id
              AND m2.house_id = ha.house_id
          )
        )
    )
  );

-- ── INSERT ────────────────────────────────────────────────────
CREATE POLICY "core_i2we_insert"
  ON "public"."core_i2we"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (
    -- 1. Mobile members: must be one of the two members
    auth.uid() = member_1_id
    OR auth.uid() = member_2_id

    -- 2. Super / Global admins: can insert for any members
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'global_admin')
    )
  );

-- ── UPDATE ────────────────────────────────────────────────────
CREATE POLICY "core_i2we_update"
  ON "public"."core_i2we"
  FOR UPDATE
  TO "authenticated"
  USING (
    auth.uid() = member_1_id
    OR auth.uid() = member_2_id

    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'global_admin')
    )
  )
  WITH CHECK (
    auth.uid() = member_1_id
    OR auth.uid() = member_2_id

    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'global_admin')
    )
  );

