/*
  # Add Covering Indexes for Remaining Unindexed Foreign Keys

  ## Summary
  Adds indexes for all remaining foreign key columns that lack covering indexes.

  ## Tables Updated
  - approval_requests: requested_by, subject_user_id
  - attendance_records: user_id
  - core_deals: from_member_id, to_member_id
  - deals: house_id
  - links: house_id
  - members: house_id, profile_id
  - profiles: house_id
*/

CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON public.approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_subject_user_id ON public.approval_requests(subject_user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON public.attendance_records(user_id);

CREATE INDEX IF NOT EXISTS idx_core_deals_from_member_id ON public.core_deals(from_member_id);
CREATE INDEX IF NOT EXISTS idx_core_deals_to_member_id ON public.core_deals(to_member_id);

CREATE INDEX IF NOT EXISTS idx_deals_house_id ON public.deals(house_id);

CREATE INDEX IF NOT EXISTS idx_links_house_id ON public.links(house_id);

CREATE INDEX IF NOT EXISTS idx_members_house_id ON public.members(house_id);
CREATE INDEX IF NOT EXISTS idx_members_profile_id ON public.members(profile_id);

CREATE INDEX IF NOT EXISTS idx_profiles_house_id ON public.profiles(house_id);
