/*
  # Fix Always-True RLS Policies for Service Role Tables

  ## Summary
  Replaces the "always true" WITH CHECK policies on knowledge_base and notifications
  with proper service_role-scoped policies. The service role bypasses RLS entirely
  by default, so these policies are redundant and unsafe when defined for role `-`
  (which means all roles). We restrict them to the service_role explicitly.

  ## Changes
  - knowledge_base: Drop always-true INSERT/UPDATE policies, add service_role-only ones
  - notifications: Drop always-true INSERT policy, add service_role-only one
*/

-- ============================================================
-- knowledge_base
-- ============================================================
DROP POLICY IF EXISTS "Allow service role to insert" ON public.knowledge_base;
DROP POLICY IF EXISTS "Allow service role to update" ON public.knowledge_base;

CREATE POLICY "Service role can insert knowledge base"
  ON public.knowledge_base FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update knowledge base"
  ON public.knowledge_base FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- notifications
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);
