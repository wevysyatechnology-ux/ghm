/*
  # Drop Unused Indexes

  ## Summary
  Removes indexes that have never been used according to Postgres statistics.
  Unused indexes consume storage and slow down write operations without providing
  any query performance benefit.

  ## Indexes Dropped
  - idx_profiles_email (profiles)
  - knowledge_base_metadata_idx (knowledge_base)
  - knowledge_base_embedding_idx (knowledge_base)
  - idx_profiles_house_id (profiles)
  - idx_members_profile_id (members)
  - idx_members_house_id (members)
  - idx_links_house_id (links)
  - idx_deals_house_id (deals)
  - idx_notifications_read (notifications)
  - idx_notifications_created_at (notifications)
  - idx_push_tokens_user_id (push_tokens)
  - idx_push_tokens_token (push_tokens)
  - idx_notification_preferences_user_id (notification_preferences)
  - idx_web_push_subscriptions_active (web_push_subscriptions)
  - idx_core_deals_from_member_id (core_deals)
  - idx_attendance_records_house_id (attendance_records)
  - idx_core_deals_to_member_id (core_deals)
  - idx_attendance_records_user_id (attendance_records)
  - idx_users_profile_id (users_profile)
  - idx_attendance_records_meeting_date (attendance_records)
  - idx_approval_requests_status (approval_requests)
  - idx_approval_requests_subject_user_id (approval_requests)
  - idx_approval_requests_requested_by (approval_requests)
  - idx_approval_requests_created_at (approval_requests)
*/

DROP INDEX IF EXISTS public.idx_profiles_email;
DROP INDEX IF EXISTS public.knowledge_base_metadata_idx;
DROP INDEX IF EXISTS public.knowledge_base_embedding_idx;
DROP INDEX IF EXISTS public.idx_profiles_house_id;
DROP INDEX IF EXISTS public.idx_members_profile_id;
DROP INDEX IF EXISTS public.idx_members_house_id;
DROP INDEX IF EXISTS public.idx_links_house_id;
DROP INDEX IF EXISTS public.idx_deals_house_id;
DROP INDEX IF EXISTS public.idx_notifications_read;
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_push_tokens_user_id;
DROP INDEX IF EXISTS public.idx_push_tokens_token;
DROP INDEX IF EXISTS public.idx_notification_preferences_user_id;
DROP INDEX IF EXISTS public.idx_web_push_subscriptions_active;
DROP INDEX IF EXISTS public.idx_core_deals_from_member_id;
DROP INDEX IF EXISTS public.idx_attendance_records_house_id;
DROP INDEX IF EXISTS public.idx_core_deals_to_member_id;
DROP INDEX IF EXISTS public.idx_attendance_records_user_id;
DROP INDEX IF EXISTS public.idx_users_profile_id;
DROP INDEX IF EXISTS public.idx_attendance_records_meeting_date;
DROP INDEX IF EXISTS public.idx_approval_requests_status;
DROP INDEX IF EXISTS public.idx_approval_requests_subject_user_id;
DROP INDEX IF EXISTS public.idx_approval_requests_requested_by;
DROP INDEX IF EXISTS public.idx_approval_requests_created_at;
