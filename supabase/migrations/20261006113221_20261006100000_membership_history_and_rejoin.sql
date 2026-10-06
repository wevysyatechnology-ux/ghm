/*
# Membership history and secure rejoin flow

1. New Table: `public.memberships`
- One row per membership term for a person.
- `member_id` stores the stable profile/auth identity used by the admin and mobile systems.
- `membership_code` is unique and permanently reserved for that term.
- `start_date`, `end_date`, and `status` describe the term period.
- `previous_membership_id` links repeated terms into a history chain.
- `created_by` and `created_at` record the admin action.

2. Existing Data
- Every existing profile with a membership code receives its first term.
- Existing active members get an active term; all other statuses get an expired term.
- Existing activity rows are linked to the member's first term where the table has a member reference.
- No existing member, code, or activity row is deleted or rewritten.
- `member_id` intentionally has no delete cascade because retired codes must remain reserved even if an account is later removed.

3. Activity Tracking Columns
- Adds nullable membership references to existing activity tables.
- BEFORE INSERT triggers capture the member's active term at creation time.
- Two-member records receive one reference per member.
- Nullable columns preserve compatibility with older clients and technical-only records.

4. Rejoin Function
- Adds admin-only `rejoin_member`.
- Active members cannot be restarted.
- `issue_new_code = true` expires the previous term and issues the next `B####` code.
- `issue_new_code = false` reopens only the latest term with its existing code.
- The current code is synchronized to both `profiles` and `users_profile`.
- The database sequence and unique constraint prevent code reuse and duplicates.

5. Security
- RLS is enabled on `memberships`.
- Only top-level GHM admins can read, create, update, or delete membership history rows.
- The rejoin function derives the acting admin from `auth.uid()` and is not callable by anon.
- Existing membership-code protection remains in place for direct client updates.
*/

CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  membership_code text NOT NULL UNIQUE,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  previous_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS memberships_one_active_per_member
  ON public.memberships (member_id)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS memberships_member_id_created_at_idx
  ON public.memberships (member_id, created_at DESC);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Top admins can view membership history" ON public.memberships;
CREATE POLICY "Top admins can view membership history" ON public.memberships FOR SELECT TO authenticated USING (public.is_top_admin());
DROP POLICY IF EXISTS "Top admins can create membership history" ON public.memberships;
CREATE POLICY "Top admins can create membership history" ON public.memberships FOR INSERT TO authenticated WITH CHECK (public.is_top_admin());
DROP POLICY IF EXISTS "Top admins can update membership history" ON public.memberships;
CREATE POLICY "Top admins can update membership history" ON public.memberships FOR UPDATE TO authenticated USING (public.is_top_admin()) WITH CHECK (public.is_top_admin());
DROP POLICY IF EXISTS "Top admins can delete membership history" ON public.memberships;
CREATE POLICY "Top admins can delete membership history" ON public.memberships FOR DELETE TO authenticated USING (public.is_top_admin());
REVOKE ALL ON TABLE public.memberships FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.memberships TO authenticated;
GRANT ALL ON TABLE public.memberships TO service_role;

INSERT INTO public.memberships (member_id, membership_code, start_date, end_date, status)
SELECT p.id, p.membership_code, p.created_at::date,
  CASE WHEN coalesce(p.membership_status, 'active') = 'active' THEN NULL ELSE greatest(p.created_at::date, coalesce(p.updated_at::date, p.created_at::date)) END,
  CASE WHEN coalesce(p.membership_status, 'active') = 'active' THEN 'active' ELSE 'expired' END
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.memberships m WHERE m.member_id = p.id)
ON CONFLICT (membership_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_profile_membership_code_to_mobile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users_profile SET membership_code = NEW.membership_code WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_profile_membership_code_to_mobile ON public.profiles;
CREATE TRIGGER sync_profile_membership_code_to_mobile AFTER UPDATE OF membership_code ON public.profiles FOR EACH ROW WHEN (OLD.membership_code IS DISTINCT FROM NEW.membership_code) EXECUTE FUNCTION public.sync_profile_membership_code_to_mobile();

CREATE OR REPLACE FUNCTION public.sync_initial_mobile_membership_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.membership_code IS NULL THEN
    UPDATE public.users_profile up SET membership_code = p.membership_code FROM public.profiles p WHERE up.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_initial_mobile_membership_code ON public.users_profile;
CREATE TRIGGER sync_initial_mobile_membership_code AFTER INSERT ON public.users_profile FOR EACH ROW EXECUTE FUNCTION public.sync_initial_mobile_membership_code();

CREATE OR REPLACE FUNCTION public.create_initial_membership_term()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.memberships (member_id, membership_code, start_date, end_date, status)
  VALUES (NEW.id, NEW.membership_code, NEW.created_at::date,
    CASE WHEN coalesce(NEW.membership_status, 'active') = 'active' THEN NULL ELSE current_date END,
    CASE WHEN coalesce(NEW.membership_status, 'active') = 'active' THEN 'active' ELSE 'expired' END)
  ON CONFLICT (membership_code) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS create_initial_membership_term ON public.profiles;
CREATE TRIGGER create_initial_membership_term AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.create_initial_membership_term();

CREATE OR REPLACE FUNCTION public.capture_current_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_patch jsonb := '{}'::jsonb;
  v_member_id uuid;
  v_membership_id uuid;
  v_index integer := 0;
BEGIN
  WHILE v_index < coalesce(array_length(TG_ARGV, 1), 0) LOOP
    v_member_id := NULLIF(to_jsonb(NEW)->>TG_ARGV[v_index], '')::uuid;
    IF v_member_id IS NOT NULL THEN
      SELECT m.id INTO v_membership_id FROM public.memberships m
      WHERE m.member_id = v_member_id AND m.status = 'active'
      ORDER BY m.start_date DESC, m.created_at DESC LIMIT 1;
      IF v_membership_id IS NOT NULL THEN
        v_patch := v_patch || jsonb_build_object(TG_ARGV[v_index + 1], v_membership_id);
      END IF;
    END IF;
    v_index := v_index + 2;
  END LOOP;
  IF v_patch <> '{}'::jsonb THEN NEW := jsonb_populate_record(NEW, v_patch); END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS from_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS to_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS from_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS to_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.i2we_events ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.core_deals ADD COLUMN IF NOT EXISTS creator_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.core_deals ADD COLUMN IF NOT EXISTS from_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.core_deals ADD COLUMN IF NOT EXISTS to_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.core_links ADD COLUMN IF NOT EXISTS from_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.core_links ADD COLUMN IF NOT EXISTS to_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.core_i2we ADD COLUMN IF NOT EXISTS member_1_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.core_i2we ADD COLUMN IF NOT EXISTS member_2_membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.channel_posts ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.deal_participants ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_base ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL;

UPDATE public.attendance a SET membership_id = m.id FROM public.memberships m WHERE a.membership_id IS NULL AND a.member_id = m.member_id;
UPDATE public.attendance_records a SET membership_id = m.id FROM public.memberships m WHERE a.membership_id IS NULL AND a.user_id = m.member_id;
UPDATE public.deals d SET from_membership_id = m.id FROM public.memberships m WHERE d.from_membership_id IS NULL AND d.from_member_id = m.member_id;
UPDATE public.deals d SET to_membership_id = m.id FROM public.memberships m WHERE d.to_membership_id IS NULL AND d.to_member_id = m.member_id;
UPDATE public.links l SET from_membership_id = m.id FROM public.memberships m WHERE l.from_membership_id IS NULL AND l.from_member_id = m.member_id;
UPDATE public.links l SET to_membership_id = m.id FROM public.memberships m WHERE l.to_membership_id IS NULL AND l.to_member_id = m.member_id;
UPDATE public.i2we_events i SET membership_id = m.id FROM public.memberships m WHERE i.membership_id IS NULL AND i.member_id = m.member_id;
UPDATE public.core_deals d SET creator_membership_id = m.id FROM public.memberships m WHERE d.creator_membership_id IS NULL AND d.creator_id = m.member_id;
UPDATE public.core_deals d SET from_membership_id = m.id FROM public.memberships m WHERE d.from_membership_id IS NULL AND d.from_member_id = m.member_id;
UPDATE public.core_deals d SET to_membership_id = m.id FROM public.memberships m WHERE d.to_membership_id IS NULL AND d.to_member_id = m.member_id;
UPDATE public.core_links l SET from_membership_id = m.id FROM public.memberships m WHERE l.from_membership_id IS NULL AND l.from_user_id = m.member_id;
UPDATE public.core_links l SET to_membership_id = m.id FROM public.memberships m WHERE l.to_membership_id IS NULL AND l.to_user_id = m.member_id;
UPDATE public.core_i2we i SET member_1_membership_id = m.id FROM public.memberships m WHERE i.member_1_membership_id IS NULL AND i.member_1_id = m.member_id;
UPDATE public.core_i2we i SET member_2_membership_id = m.id FROM public.memberships m WHERE i.member_2_membership_id IS NULL AND i.member_2_id = m.member_id;
UPDATE public.approval_requests a SET membership_id = m.id FROM public.memberships m WHERE a.membership_id IS NULL AND a.subject_user_id = m.member_id;
UPDATE public.notifications n SET membership_id = m.id FROM public.memberships m WHERE n.membership_id IS NULL AND n.user_id = m.member_id;
UPDATE public.channel_posts p SET membership_id = m.id FROM public.memberships m WHERE p.membership_id IS NULL AND p.user_id = m.member_id;
UPDATE public.deal_participants d SET membership_id = m.id FROM public.memberships m WHERE d.membership_id IS NULL AND d.user_id = m.member_id;
UPDATE public.members x SET membership_id = m.id FROM public.memberships m WHERE x.membership_id IS NULL AND x.profile_id = m.member_id;
UPDATE public.knowledge_base k SET membership_id = m.id FROM public.memberships m WHERE k.membership_id IS NULL AND k.user_id = m.member_id;

DROP TRIGGER IF EXISTS capture_attendance_membership ON public.attendance;
CREATE TRIGGER capture_attendance_membership BEFORE INSERT ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('member_id', 'membership_id');
DROP TRIGGER IF EXISTS capture_attendance_records_membership ON public.attendance_records;
CREATE TRIGGER capture_attendance_records_membership BEFORE INSERT ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('user_id', 'membership_id');
DROP TRIGGER IF EXISTS capture_deals_membership ON public.deals;
CREATE TRIGGER capture_deals_membership BEFORE INSERT ON public.deals FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('from_member_id', 'from_membership_id', 'to_member_id', 'to_membership_id');
DROP TRIGGER IF EXISTS capture_links_membership ON public.links;
CREATE TRIGGER capture_links_membership BEFORE INSERT ON public.links FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('from_member_id', 'from_membership_id', 'to_member_id', 'to_membership_id');
DROP TRIGGER IF EXISTS capture_i2we_membership ON public.i2we_events;
CREATE TRIGGER capture_i2we_membership BEFORE INSERT ON public.i2we_events FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('member_id', 'membership_id');
DROP TRIGGER IF EXISTS capture_core_deals_membership ON public.core_deals;
CREATE TRIGGER capture_core_deals_membership BEFORE INSERT ON public.core_deals FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('creator_id', 'creator_membership_id', 'from_member_id', 'from_membership_id', 'to_member_id', 'to_membership_id');
DROP TRIGGER IF EXISTS capture_core_links_membership ON public.core_links;
CREATE TRIGGER capture_core_links_membership BEFORE INSERT ON public.core_links FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('from_user_id', 'from_membership_id', 'to_user_id', 'to_membership_id');
DROP TRIGGER IF EXISTS capture_core_i2we_membership ON public.core_i2we;
CREATE TRIGGER capture_core_i2we_membership BEFORE INSERT ON public.core_i2we FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('member_1_id', 'member_1_membership_id', 'member_2_id', 'member_2_membership_id');
DROP TRIGGER IF EXISTS capture_approval_membership ON public.approval_requests;
CREATE TRIGGER capture_approval_membership BEFORE INSERT ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('subject_user_id', 'membership_id');
DROP TRIGGER IF EXISTS capture_notifications_membership ON public.notifications;
CREATE TRIGGER capture_notifications_membership BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('user_id', 'membership_id');
DROP TRIGGER IF EXISTS capture_channel_posts_membership ON public.channel_posts;
CREATE TRIGGER capture_channel_posts_membership BEFORE INSERT ON public.channel_posts FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('user_id', 'membership_id');
DROP TRIGGER IF EXISTS capture_deal_participants_membership ON public.deal_participants;
CREATE TRIGGER capture_deal_participants_membership BEFORE INSERT ON public.deal_participants FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('user_id', 'membership_id');
DROP TRIGGER IF EXISTS capture_members_membership ON public.members;
CREATE TRIGGER capture_members_membership BEFORE INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('profile_id', 'membership_id');
DROP TRIGGER IF EXISTS capture_knowledge_base_membership ON public.knowledge_base;
CREATE TRIGGER capture_knowledge_base_membership BEFORE INSERT ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.capture_current_membership('user_id', 'membership_id');

CREATE OR REPLACE FUNCTION public.rejoin_member(p_member_id uuid, p_issue_new_code boolean, p_start_date date DEFAULT current_date, p_end_date date DEFAULT NULL)
RETURNS TABLE (membership_id uuid, membership_code text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_latest public.memberships%ROWTYPE;
  v_new_id uuid;
  v_new_code text;
BEGIN
  IF NOT public.is_top_admin() THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_member_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found' USING ERRCODE = '22023'; END IF;
  IF coalesce(v_profile.membership_status, 'active') = 'active' THEN RAISE EXCEPTION 'Active members cannot be restarted' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_latest FROM public.memberships WHERE member_id = p_member_id ORDER BY created_at DESC, start_date DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membership history is missing' USING ERRCODE = '22023'; END IF;

  IF p_issue_new_code THEN
    UPDATE public.memberships SET status = 'expired', end_date = coalesce(end_date, p_start_date - 1) WHERE id = v_latest.id;
    v_new_code := 'B' || nextval('public.membership_code_seq')::text;
    INSERT INTO public.memberships (member_id, membership_code, start_date, end_date, status, previous_membership_id, created_by)
    VALUES (p_member_id, v_new_code, p_start_date, p_end_date, 'active', v_latest.id, auth.uid()) RETURNING id INTO v_new_id;
    UPDATE public.profiles SET membership_code = v_new_code, membership_status = 'active' WHERE id = p_member_id;
    UPDATE public.users_profile SET membership_code = v_new_code, membership_status = 'active', is_suspended = false WHERE id = p_member_id;
    RETURN QUERY SELECT v_new_id, v_new_code, 'active'::text;
  ELSE
    UPDATE public.memberships SET status = 'active', end_date = p_end_date WHERE id = v_latest.id;
    UPDATE public.profiles SET membership_status = 'active' WHERE id = p_member_id;
    UPDATE public.users_profile SET membership_status = 'active', is_suspended = false WHERE id = p_member_id;
    RETURN QUERY SELECT v_latest.id, v_latest.membership_code, 'active'::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rejoin_member(uuid, boolean, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rejoin_member(uuid, boolean, date, date) TO authenticated;
REVOKE ALL ON FUNCTION public.capture_current_membership() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_current_membership() TO service_role;
REVOKE ALL ON FUNCTION public.create_initial_membership_term() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_initial_membership_term() TO service_role;
REVOKE ALL ON FUNCTION public.sync_profile_membership_code_to_mobile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_profile_membership_code_to_mobile() TO service_role;
REVOKE ALL ON FUNCTION public.sync_initial_mobile_membership_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_initial_mobile_membership_code() TO service_role;
