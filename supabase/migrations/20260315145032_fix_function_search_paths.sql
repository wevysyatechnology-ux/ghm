/*
  # Fix Function Search Paths

  ## Summary
  Adds SET search_path = '' to all functions with mutable search paths.
  This prevents potential search_path injection attacks.

  ## Functions Fixed
  - cleanup_old_notifications
  - get_house_members
  - get_unread_notification_count
  - mark_all_notifications_read
  - update_updated_at_column
  - search_knowledge
  - get_my_house_id
*/

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.notifications
    WHERE read = true
    AND read_at < NOW() - INTERVAL '30 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_house_members(p_house_id uuid)
RETURNS TABLE(id uuid, full_name text, phone_number text, business_category text, city text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    up.phone_number,
    up.business_category,
    COALESCE(up.city, p.zone) as city
  FROM public.profiles p
  LEFT JOIN public.users_profile up ON up.id = p.id
  WHERE p.house_id = p_house_id
    AND p.approval_status = 'approved';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM public.notifications
    WHERE user_id = p_user_id
    AND read = false;

    RETURN unread_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.notifications
    SET read = true,
        read_at = NOW()
    WHERE user_id = p_user_id
    AND read = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_knowledge(query_embedding vector, match_limit integer DEFAULT 5)
RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.get_my_house_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT house_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;
