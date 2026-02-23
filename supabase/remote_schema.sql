


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."attendance_status" AS ENUM (
    'normal',
    'probation',
    'category_open',
    'removal_eligible'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


CREATE TYPE "public"."link_status" AS ENUM (
    'open',
    'closed'
);


ALTER TYPE "public"."link_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'active',
    'expired',
    'suspended'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_type" AS ENUM (
    'regular',
    'privileged'
);


ALTER TYPE "public"."membership_type" OWNER TO "postgres";


CREATE TYPE "public"."vertical_type" AS ENUM (
    'inner_circle',
    'open_circle'
);


ALTER TYPE "public"."vertical_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_member"("member_id" "uuid", "new_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'global_admin')
  ) THEN
    RAISE EXCEPTION 'Only administrators can approve members';
  END IF;

  -- Update the member's approval status
  UPDATE profiles
  SET approval_status = new_status
  WHERE id = member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
END;
$$;


ALTER FUNCTION "public"."approve_member"("member_id" "uuid", "new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM notifications
    WHERE read = true
    AND read_at < NOW() - INTERVAL '30 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_notifications"() IS 'Deletes read notifications older than 30 days';



CREATE OR REPLACE FUNCTION "public"."create_notification_preferences_for_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_notification_preferences_for_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM notifications
    WHERE user_id = p_user_id
    AND read = false;
    
    RETURN unread_count;
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") IS 'Returns count of unread notifications for a user';



CREATE OR REPLACE FUNCTION "public"."get_user_approval_status"("user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT approval_status
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_approval_status"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_role"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone_number,
    business,
    industry,
    approval_status,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'business', ''),
    COALESCE(NEW.raw_user_meta_data->>'industry', ''),
    'pending',
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE notifications
    SET read = true,
        read_at = NOW()
    WHERE user_id = p_user_id
    AND read = false;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") IS 'Marks all notifications as read for a user';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_knowledge"("query_embedding" "public"."vector", "match_limit" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base kb
  WHERE kb.embedding IS NOT NULL
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;


ALTER FUNCTION "public"."search_knowledge"("query_embedding" "public"."vector", "match_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_knowledge"("query_embedding" "public"."vector", "match_limit" integer) IS 'Semantic search using cosine similarity between embeddings';



CREATE OR REPLACE FUNCTION "public"."signup_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_mobile" "text", "p_business" "text", "p_industry" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- This would need Service Role key to work
  -- For now, just create the profile after signup succeeds
  
  RAISE EXCEPTION 'This function requires Service Role access';
  
END;
$$;


ALTER FUNCTION "public"."signup_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_mobile" "text", "p_business" "text", "p_industry" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_type" "text" NOT NULL,
    "subject_user_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "remarks" "text",
    "metadata" "jsonb",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "approval_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['category_opening'::"text", 'member_removal'::"text", 'role_assignment'::"text", 'membership_change'::"text", 'suspension'::"text"]))),
    CONSTRAINT "approval_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."approval_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."approval_requests" IS 'Approval workflow requests for category opening, member actions, and role/membership changes';



CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "member_id" "uuid",
    "marked_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "house_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "meeting_date" "date" NOT NULL,
    "status" "text" NOT NULL,
    "marked_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "attendance_records_status_check" CHECK (("status" = ANY (ARRAY['present'::"text", 'absent'::"text"])))
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."attendance_records" IS 'Attendance entries per member, house, and meeting date for admin module';



CREATE TABLE IF NOT EXISTS "public"."channel_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "post_type" "text" DEFAULT 'general'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "channel_posts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'closed'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."channel_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "category" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "house_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "amount" numeric DEFAULT 0,
    "deal_type" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "core_deals_deal_type_check" CHECK (("deal_type" = ANY (ARRAY['house_deal'::"text", 'wevysya_deal'::"text"]))),
    CONSTRAINT "core_deals_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'completed'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."core_deals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_house_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "house_id" "uuid" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."core_house_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_houses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "house_name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "country" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."core_houses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_i2we" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_1_id" "uuid" NOT NULL,
    "member_2_id" "uuid" NOT NULL,
    "house_id" "uuid" NOT NULL,
    "meeting_date" timestamp with time zone NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "core_i2we_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."core_i2we" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "to_user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "contact_name" "text" DEFAULT ''::"text" NOT NULL,
    "contact_phone" "text" DEFAULT ''::"text" NOT NULL,
    "contact_email" "text",
    "urgency" integer DEFAULT 5,
    "house_id" "uuid",
    "status" "public"."link_status" DEFAULT 'open'::"public"."link_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "core_links_urgency_check" CHECK ((("urgency" >= 1) AND ("urgency" <= 10)))
);


ALTER TABLE "public"."core_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "membership_type" "public"."membership_type" NOT NULL,
    "membership_status" "public"."membership_status" DEFAULT 'active'::"public"."membership_status",
    "valid_from" timestamp with time zone NOT NULL,
    "valid_to" timestamp with time zone,
    "financial_year" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."core_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deal_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'participant'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deal_participants_role_check" CHECK (("role" = ANY (ARRAY['creator'::"text", 'participant'::"text"])))
);


ALTER TABLE "public"."deal_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "amount" numeric NOT NULL,
    "from_member_id" "uuid",
    "to_member_id" "uuid",
    "description" "text" NOT NULL,
    "house_id" "uuid",
    "deal_date" "date" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."deals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."houses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "state" "text" NOT NULL,
    "zone" "text" NOT NULL,
    "email" "text",
    "mobile" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "country" "text" DEFAULT 'India'::"text" NOT NULL
);


ALTER TABLE "public"."houses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."i2we_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "event_name" "text" NOT NULL,
    "description" "text",
    "event_date" "date" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."i2we_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."knowledge_base" OWNER TO "postgres";


COMMENT ON TABLE "public"."knowledge_base" IS 'Stores knowledge documents with embeddings for Voice OS semantic search';



COMMENT ON COLUMN "public"."knowledge_base"."embedding" IS 'OpenAI text-embedding-ada-002 vector (1536 dimensions)';



CREATE TABLE IF NOT EXISTS "public"."links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_member_id" "uuid",
    "to_member_id" "uuid",
    "description" "text" NOT NULL,
    "house_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "house_id" "uuid",
    "business" "text",
    "industry" "text",
    "keywords" "text"[] DEFAULT '{}'::"text"[],
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "link_received" boolean DEFAULT true,
    "deal_recorded" boolean DEFAULT true,
    "meeting_reminder" boolean DEFAULT true,
    "attendance_marked" boolean DEFAULT true,
    "ai_match_suggestion" boolean DEFAULT true,
    "ai_inactive_reminder" boolean DEFAULT true,
    "application_submitted" boolean DEFAULT true,
    "application_approved" boolean DEFAULT true,
    "push_enabled" boolean DEFAULT true,
    "email_enabled" boolean DEFAULT true,
    "in_app_enabled" boolean DEFAULT true,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_preferences" IS 'User preferences for notification types';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    "fcm_message_id" "text",
    "delivery_status" "text" DEFAULT 'pending'::"text",
    "error_message" "text",
    CONSTRAINT "notifications_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Stores all push notifications sent to users';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "house_id" "uuid",
    "zone" "text",
    "business" "text",
    "industry" "text",
    "keywords" "text"[] DEFAULT '{}'::"text"[],
    "avatar_url" "text",
    "mobile" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "auth_user_id" "uuid",
    "approval_status" "text" DEFAULT 'pending'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text", 'zone_admin'::"text", 'house_admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expo_push_token" "text" NOT NULL,
    "device_type" "text" NOT NULL,
    "device_name" "text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "push_tokens_device_type_check" CHECK (("device_type" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_tokens" IS 'Stores Expo push tokens for sending notifications';



CREATE TABLE IF NOT EXISTS "public"."users_profile" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone_number" "text",
    "vertical_type" "public"."vertical_type",
    "country" "text",
    "state" "text",
    "city" "text",
    "business_category" "text",
    "attendance_status" "public"."attendance_status" DEFAULT 'normal'::"public"."attendance_status",
    "absence_count" integer DEFAULT 0,
    "is_suspended" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."virtual_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "membership_status" "public"."membership_status" DEFAULT 'active'::"public"."membership_status",
    "valid_from" timestamp with time zone NOT NULL,
    "valid_to" timestamp with time zone NOT NULL,
    "financial_year" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."virtual_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."web_push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."web_push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."web_push_subscriptions" IS 'Browser push subscriptions for web notifications via VAPID';



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_house_user_meeting_unique" UNIQUE ("house_id", "user_id", "meeting_date");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_posts"
    ADD CONSTRAINT "channel_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."core_deals"
    ADD CONSTRAINT "core_deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_house_members"
    ADD CONSTRAINT "core_house_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_house_members"
    ADD CONSTRAINT "core_house_members_user_id_house_id_key" UNIQUE ("user_id", "house_id");



ALTER TABLE ONLY "public"."core_houses"
    ADD CONSTRAINT "core_houses_house_name_key" UNIQUE ("house_name");



ALTER TABLE ONLY "public"."core_houses"
    ADD CONSTRAINT "core_houses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_i2we"
    ADD CONSTRAINT "core_i2we_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_links"
    ADD CONSTRAINT "core_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_memberships"
    ADD CONSTRAINT "core_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_memberships"
    ADD CONSTRAINT "core_memberships_user_id_financial_year_key" UNIQUE ("user_id", "financial_year");



ALTER TABLE ONLY "public"."deal_participants"
    ADD CONSTRAINT "deal_participants_deal_id_user_id_key" UNIQUE ("deal_id", "user_id");



ALTER TABLE ONLY "public"."deal_participants"
    ADD CONSTRAINT "deal_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."houses"
    ADD CONSTRAINT "houses_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."houses"
    ADD CONSTRAINT "houses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."i2we_events"
    ADD CONSTRAINT "i2we_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."links"
    ADD CONSTRAINT "links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_expo_push_token_key" UNIQUE ("user_id", "expo_push_token");



ALTER TABLE ONLY "public"."users_profile"
    ADD CONSTRAINT "users_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."virtual_memberships"
    ADD CONSTRAINT "virtual_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."virtual_memberships"
    ADD CONSTRAINT "virtual_memberships_user_id_financial_year_key" UNIQUE ("user_id", "financial_year");



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_approval_requests_created_at" ON "public"."approval_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_approval_requests_requested_by" ON "public"."approval_requests" USING "btree" ("requested_by");



CREATE INDEX "idx_approval_requests_status" ON "public"."approval_requests" USING "btree" ("status");



CREATE INDEX "idx_approval_requests_subject_user_id" ON "public"."approval_requests" USING "btree" ("subject_user_id");



CREATE INDEX "idx_attendance_records_house_id" ON "public"."attendance_records" USING "btree" ("house_id");



CREATE INDEX "idx_attendance_records_meeting_date" ON "public"."attendance_records" USING "btree" ("meeting_date" DESC);



CREATE INDEX "idx_attendance_records_user_id" ON "public"."attendance_records" USING "btree" ("user_id");



CREATE INDEX "idx_deals_house_id" ON "public"."deals" USING "btree" ("house_id");



CREATE INDEX "idx_links_house_id" ON "public"."links" USING "btree" ("house_id");



CREATE INDEX "idx_members_house_id" ON "public"."members" USING "btree" ("house_id");



CREATE INDEX "idx_members_profile_id" ON "public"."members" USING "btree" ("profile_id");



CREATE INDEX "idx_notification_preferences_user_id" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_approval_status" ON "public"."profiles" USING "btree" ("approval_status");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_house_id" ON "public"."profiles" USING "btree" ("house_id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_push_tokens_token" ON "public"."push_tokens" USING "btree" ("expo_push_token");



CREATE INDEX "idx_push_tokens_user_id" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_users_profile_id" ON "public"."users_profile" USING "btree" ("id");



CREATE INDEX "idx_web_push_subscriptions_active" ON "public"."web_push_subscriptions" USING "btree" ("active");



CREATE INDEX "idx_web_push_subscriptions_user_id" ON "public"."web_push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "knowledge_base_embedding_idx" ON "public"."knowledge_base" USING "ivfflat" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "knowledge_base_metadata_idx" ON "public"."knowledge_base" USING "gin" ("metadata");



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users_profile"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."core_houses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "public"."users_profile"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_posts"
    ADD CONSTRAINT "channel_posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_posts"
    ADD CONSTRAINT "channel_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_deals"
    ADD CONSTRAINT "core_deals_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_deals"
    ADD CONSTRAINT "core_deals_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id");



ALTER TABLE ONLY "public"."core_house_members"
    ADD CONSTRAINT "core_house_members_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."core_houses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_house_members"
    ADD CONSTRAINT "core_house_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_i2we"
    ADD CONSTRAINT "core_i2we_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id");



ALTER TABLE ONLY "public"."core_i2we"
    ADD CONSTRAINT "core_i2we_member_1_id_fkey" FOREIGN KEY ("member_1_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_i2we"
    ADD CONSTRAINT "core_i2we_member_2_id_fkey" FOREIGN KEY ("member_2_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_links"
    ADD CONSTRAINT "core_links_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_links"
    ADD CONSTRAINT "core_links_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."core_houses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_links"
    ADD CONSTRAINT "core_links_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."core_memberships"
    ADD CONSTRAINT "core_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_participants"
    ADD CONSTRAINT "deal_participants_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."core_deals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deal_participants"
    ADD CONSTRAINT "deal_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."houses"
    ADD CONSTRAINT "houses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."i2we_events"
    ADD CONSTRAINT "i2we_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."i2we_events"
    ADD CONSTRAINT "i2we_events_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."links"
    ADD CONSTRAINT "links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."links"
    ADD CONSTRAINT "links_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."links"
    ADD CONSTRAINT "links_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id");



ALTER TABLE ONLY "public"."links"
    ADD CONSTRAINT "links_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "public"."houses"("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users_profile"
    ADD CONSTRAINT "users_profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."virtual_memberships"
    ADD CONSTRAINT "virtual_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete houses" ON "public"."houses" FOR DELETE TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text"])));



CREATE POLICY "Admins can delete members" ON "public"."members" FOR DELETE TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text", 'house_admin'::"text"])));



CREATE POLICY "Admins can insert houses" ON "public"."houses" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text"])));



CREATE POLICY "Admins can insert members" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text", 'house_admin'::"text"])));



CREATE POLICY "Admins can mark attendance" ON "public"."attendance" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text", 'house_admin'::"text"])));



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text"]))))));



CREATE POLICY "Admins can update houses" ON "public"."houses" FOR UPDATE TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text"]))) WITH CHECK (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text"])));



CREATE POLICY "Admins can update members" ON "public"."members" FOR UPDATE TO "authenticated" USING (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text", 'house_admin'::"text"]))) WITH CHECK (("public"."get_user_role"("auth"."uid"()) = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text", 'house_admin'::"text"])));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"text", 'global_admin'::"text", 'zone_admin'::"text", 'house_admin'::"text"]))))));



CREATE POLICY "All authenticated users can view attendance" ON "public"."attendance" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view deals" ON "public"."deals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view houses" ON "public"."houses" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view i2we events" ON "public"."i2we_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view links" ON "public"."links" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All authenticated users can view members" ON "public"."members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to all authenticated users" ON "public"."knowledge_base" FOR SELECT USING (true);



CREATE POLICY "Allow service role to insert" ON "public"."knowledge_base" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow service role to update" ON "public"."knowledge_base" FOR UPDATE USING (true);



CREATE POLICY "Authenticated users can create deals" ON "public"."deals" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Authenticated users can create i2we events" ON "public"."i2we_events" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Authenticated users can create links" ON "public"."links" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Authenticated users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can read channels" ON "public"."channels" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Authenticated users can read houses" ON "public"."core_houses" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read posts" ON "public"."channel_posts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable delete for own deals" ON "public"."deals" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Enable delete for own events" ON "public"."i2we_events" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Enable delete for own links" ON "public"."links" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Enable read for authenticated users" ON "public"."core_deals" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "creator_id") OR (EXISTS ( SELECT 1
   FROM "public"."core_house_members"
  WHERE (("core_house_members"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("core_house_members"."house_id" = "core_deals"."house_id")))) OR ("deal_type" = 'wevysya_deal'::"text")));



CREATE POLICY "Enable read for authenticated users" ON "public"."core_house_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read for authenticated users" ON "public"."core_links" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "from_user_id") OR (( SELECT "auth"."uid"() AS "uid") = "to_user_id")));



CREATE POLICY "Enable read for authenticated users" ON "public"."core_memberships" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read for authenticated users" ON "public"."members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable update for own deals" ON "public"."deals" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "created_by")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Enable update for own events" ON "public"."i2we_events" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "created_by")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Enable update for own links" ON "public"."links" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "created_by")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Members can create I2WE meetings" ON "public"."core_i2we" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "member_1_id") OR (( SELECT "auth"."uid"() AS "uid") = "member_2_id")));



CREATE POLICY "Members can read their I2WE meetings" ON "public"."core_i2we" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "member_1_id") OR (( SELECT "auth"."uid"() AS "uid") = "member_2_id")));



CREATE POLICY "Members can update their I2WE meetings" ON "public"."core_i2we" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "member_1_id") OR (( SELECT "auth"."uid"() AS "uid") = "member_2_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "member_1_id") OR (( SELECT "auth"."uid"() AS "uid") = "member_2_id")));



CREATE POLICY "Service role can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage web push subscriptions" ON "public"."web_push_subscriptions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create deals" ON "public"."core_deals" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "creator_id"));



CREATE POLICY "Users can create links" ON "public"."core_links" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "from_user_id"));



CREATE POLICY "Users can create posts" ON "public"."channel_posts" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own push tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own web push subscriptions" ON "public"."web_push_subscriptions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their posts" ON "public"."channel_posts" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."users_profile" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can insert their own preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own push tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own web push subscriptions" ON "public"."web_push_subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can join deals" ON "public"."deal_participants" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can leave deals" ON "public"."deal_participants" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read own profile" ON "public"."users_profile" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can read own virtual memberships" ON "public"."virtual_memberships" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read participants of their deals" ON "public"."deal_participants" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."core_deals"
  WHERE (("core_deals"."id" = "deal_participants"."deal_id") AND ("core_deals"."creator_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update own profile" ON "public"."users_profile" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their deals" ON "public"."core_deals" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "creator_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "creator_id"));



CREATE POLICY "Users can update their links" ON "public"."core_links" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "from_user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "from_user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own preferences" ON "public"."notification_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own push tokens" ON "public"."push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own web push subscriptions" ON "public"."web_push_subscriptions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their posts" ON "public"."channel_posts" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own preferences" ON "public"."notification_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own web push subscriptions" ON "public"."web_push_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channel_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."core_house_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."core_houses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."i2we_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_signup" ON "public"."profiles" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."web_push_subscriptions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_member"("member_id" "uuid", "new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_member"("member_id" "uuid", "new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_member"("member_id" "uuid", "new_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification_preferences_for_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification_preferences_for_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification_preferences_for_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_approval_status"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_approval_status"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_approval_status"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_knowledge"("query_embedding" "public"."vector", "match_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_knowledge"("query_embedding" "public"."vector", "match_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_knowledge"("query_embedding" "public"."vector", "match_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."signup_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_mobile" "text", "p_business" "text", "p_industry" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."signup_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_mobile" "text", "p_business" "text", "p_industry" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."signup_user"("p_email" "text", "p_password" "text", "p_full_name" "text", "p_mobile" "text", "p_business" "text", "p_industry" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."approval_requests" TO "anon";
GRANT ALL ON TABLE "public"."approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_requests" TO "service_role";



GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT ALL ON TABLE "public"."channel_posts" TO "anon";
GRANT ALL ON TABLE "public"."channel_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_posts" TO "service_role";



GRANT ALL ON TABLE "public"."channels" TO "anon";
GRANT ALL ON TABLE "public"."channels" TO "authenticated";
GRANT ALL ON TABLE "public"."channels" TO "service_role";



GRANT ALL ON TABLE "public"."core_deals" TO "anon";
GRANT ALL ON TABLE "public"."core_deals" TO "authenticated";
GRANT ALL ON TABLE "public"."core_deals" TO "service_role";



GRANT ALL ON TABLE "public"."core_house_members" TO "anon";
GRANT ALL ON TABLE "public"."core_house_members" TO "authenticated";
GRANT ALL ON TABLE "public"."core_house_members" TO "service_role";



GRANT ALL ON TABLE "public"."core_houses" TO "anon";
GRANT ALL ON TABLE "public"."core_houses" TO "authenticated";
GRANT ALL ON TABLE "public"."core_houses" TO "service_role";



GRANT ALL ON TABLE "public"."core_i2we" TO "anon";
GRANT ALL ON TABLE "public"."core_i2we" TO "authenticated";
GRANT ALL ON TABLE "public"."core_i2we" TO "service_role";



GRANT ALL ON TABLE "public"."core_links" TO "anon";
GRANT ALL ON TABLE "public"."core_links" TO "authenticated";
GRANT ALL ON TABLE "public"."core_links" TO "service_role";



GRANT ALL ON TABLE "public"."core_memberships" TO "anon";
GRANT ALL ON TABLE "public"."core_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."core_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."deal_participants" TO "anon";
GRANT ALL ON TABLE "public"."deal_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."deal_participants" TO "service_role";



GRANT ALL ON TABLE "public"."deals" TO "anon";
GRANT ALL ON TABLE "public"."deals" TO "authenticated";
GRANT ALL ON TABLE "public"."deals" TO "service_role";



GRANT ALL ON TABLE "public"."houses" TO "anon";
GRANT ALL ON TABLE "public"."houses" TO "authenticated";
GRANT ALL ON TABLE "public"."houses" TO "service_role";



GRANT ALL ON TABLE "public"."i2we_events" TO "anon";
GRANT ALL ON TABLE "public"."i2we_events" TO "authenticated";
GRANT ALL ON TABLE "public"."i2we_events" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."links" TO "anon";
GRANT ALL ON TABLE "public"."links" TO "authenticated";
GRANT ALL ON TABLE "public"."links" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."users_profile" TO "anon";
GRANT ALL ON TABLE "public"."users_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."users_profile" TO "service_role";



GRANT ALL ON TABLE "public"."virtual_memberships" TO "anon";
GRANT ALL ON TABLE "public"."virtual_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."virtual_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







