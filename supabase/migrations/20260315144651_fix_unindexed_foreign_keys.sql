/*
  # Add Covering Indexes for Foreign Keys

  ## Summary
  Adds indexes for all unindexed foreign key columns to improve query performance.

  ## Tables Updated
  - approval_requests: approved_by
  - attendance: marked_by, member_id
  - attendance_records: marked_by
  - channel_posts: channel_id, user_id
  - core_deals: creator_id, house_id
  - core_house_members: house_id
  - core_i2we: house_id, member_1_id, member_2_id
  - core_links: from_user_id, house_id, to_user_id
  - deal_participants: user_id
  - deals: created_by, from_member_id, to_member_id
  - events: created_by, house_id
  - houses: created_by
  - i2we_events: created_by, member_id
  - links: created_by, from_member_id, to_member_id
  - profiles: auth_user_id
*/

CREATE INDEX IF NOT EXISTS idx_approval_requests_approved_by ON public.approval_requests(approved_by);

CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON public.attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON public.attendance(member_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_marked_by ON public.attendance_records(marked_by);

CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_id ON public.channel_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_posts_user_id ON public.channel_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_core_deals_creator_id ON public.core_deals(creator_id);
CREATE INDEX IF NOT EXISTS idx_core_deals_house_id ON public.core_deals(house_id);

CREATE INDEX IF NOT EXISTS idx_core_house_members_house_id ON public.core_house_members(house_id);

CREATE INDEX IF NOT EXISTS idx_core_i2we_house_id ON public.core_i2we(house_id);
CREATE INDEX IF NOT EXISTS idx_core_i2we_member_1_id ON public.core_i2we(member_1_id);
CREATE INDEX IF NOT EXISTS idx_core_i2we_member_2_id ON public.core_i2we(member_2_id);

CREATE INDEX IF NOT EXISTS idx_core_links_from_user_id ON public.core_links(from_user_id);
CREATE INDEX IF NOT EXISTS idx_core_links_house_id ON public.core_links(house_id);
CREATE INDEX IF NOT EXISTS idx_core_links_to_user_id ON public.core_links(to_user_id);

CREATE INDEX IF NOT EXISTS idx_deal_participants_user_id ON public.deal_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_deals_created_by ON public.deals(created_by);
CREATE INDEX IF NOT EXISTS idx_deals_from_member_id ON public.deals(from_member_id);
CREATE INDEX IF NOT EXISTS idx_deals_to_member_id ON public.deals(to_member_id);

CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_house_id ON public.events(house_id);

CREATE INDEX IF NOT EXISTS idx_houses_created_by ON public.houses(created_by);

CREATE INDEX IF NOT EXISTS idx_i2we_events_created_by ON public.i2we_events(created_by);
CREATE INDEX IF NOT EXISTS idx_i2we_events_member_id ON public.i2we_events(member_id);

CREATE INDEX IF NOT EXISTS idx_links_created_by ON public.links(created_by);
CREATE INDEX IF NOT EXISTS idx_links_from_member_id ON public.links(from_member_id);
CREATE INDEX IF NOT EXISTS idx_links_to_member_id ON public.links(to_member_id);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
