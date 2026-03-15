/*
  # Drop Unused Indexes

  ## Summary
  Removes indexes that have not been used according to Postgres statistics.
  These consume storage and slow down writes without benefiting queries.

  ## Indexes Dropped
  From approval_requests, attendance, attendance_records, channel_posts,
  core_i2we, core_links, core_deals, core_house_members, deal_participants,
  deals, events, houses, i2we_events, links tables.
*/

DROP INDEX IF EXISTS public.idx_approval_requests_approved_by;

DROP INDEX IF EXISTS public.idx_attendance_marked_by;
DROP INDEX IF EXISTS public.idx_attendance_member_id;

DROP INDEX IF EXISTS public.idx_attendance_records_marked_by;

DROP INDEX IF EXISTS public.idx_channel_posts_channel_id;
DROP INDEX IF EXISTS public.idx_channel_posts_user_id;

DROP INDEX IF EXISTS public.idx_core_i2we_house_id;
DROP INDEX IF EXISTS public.idx_core_i2we_member_1_id;
DROP INDEX IF EXISTS public.idx_core_i2we_member_2_id;

DROP INDEX IF EXISTS public.idx_core_links_from_user_id;
DROP INDEX IF EXISTS public.idx_core_links_house_id;
DROP INDEX IF EXISTS public.idx_core_links_to_user_id;

DROP INDEX IF EXISTS public.idx_deal_participants_user_id;

DROP INDEX IF EXISTS public.idx_deals_created_by;
DROP INDEX IF EXISTS public.idx_deals_from_member_id;
DROP INDEX IF EXISTS public.idx_deals_to_member_id;

DROP INDEX IF EXISTS public.idx_events_created_by;
DROP INDEX IF EXISTS public.idx_events_house_id;

DROP INDEX IF EXISTS public.idx_core_deals_creator_id;
DROP INDEX IF EXISTS public.idx_core_deals_house_id;
DROP INDEX IF EXISTS public.idx_core_deals_from_member_id;
DROP INDEX IF EXISTS public.idx_core_deals_to_member_id;

DROP INDEX IF EXISTS public.idx_core_house_members_house_id;

DROP INDEX IF EXISTS public.idx_houses_created_by;

DROP INDEX IF EXISTS public.idx_i2we_events_created_by;
DROP INDEX IF EXISTS public.idx_i2we_events_member_id;

DROP INDEX IF EXISTS public.idx_links_created_by;
DROP INDEX IF EXISTS public.idx_links_from_member_id;
DROP INDEX IF EXISTS public.idx_links_to_member_id;
