-- =============================================================
-- GHM Events System Setup
--
-- Targeting hierarchy (based on actual schema):
--   house   → profiles.house_id = events.house_id
--   zone    → profiles → houses WHERE houses.zone = events.zone
--   state   → profiles → houses WHERE houses.state = events.state
--   country → profiles → houses WHERE houses.country = events.country
--   global  → all approved members
-- =============================================================

-- ── Create events table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title         text        NOT NULL,
  description   text,
  event_date    date        NOT NULL,
  event_time    time,
  location      text,
  meeting_link  text,
  -- Scope
  event_level   text        NOT NULL
                CHECK (event_level IN ('house','zone','state','country','global')),
  house_id      uuid        REFERENCES public.houses(id) ON DELETE SET NULL,
  zone          text,       -- matches houses.zone
  state         text,       -- matches houses.state
  country       text,       -- matches houses.country
  send_notification boolean DEFAULT true,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.events OWNER TO postgres;

-- ── Enable RLS ────────────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_delete" ON public.events;

-- All authenticated users can read (mobile app fetches own-scope events)
CREATE POLICY "events_select"
  ON public.events FOR SELECT TO authenticated
  USING (true);

-- Only super_admin / global_admin can create
CREATE POLICY "events_insert"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','global_admin')
    )
  );

-- Creator or admins can update
CREATE POLICY "events_update"
  ON public.events FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','global_admin')
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','global_admin')
    )
  );

-- Creator or admins can delete
CREATE POLICY "events_delete"
  ON public.events FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','global_admin')
    )
  );

-- ── Grants ────────────────────────────────────────────────────
GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;
