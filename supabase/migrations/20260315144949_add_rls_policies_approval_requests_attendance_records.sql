/*
  # Add RLS Policies for approval_requests and attendance_records

  ## Summary
  These tables have RLS enabled but no policies defined, which means no one
  can access them. This adds the minimum necessary policies for legitimate access.

  ## Tables
  - approval_requests: admins can manage all; users can view/create their own requests
  - attendance_records: admins can manage all; members can view their own records
*/

-- ============================================================
-- approval_requests
-- ============================================================
CREATE POLICY "Users can view own approval requests"
  ON public.approval_requests FOR SELECT
  TO authenticated
  USING (
    subject_user_id = (select auth.uid()) OR
    requested_by = (select auth.uid()) OR
    get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text])
  );

CREATE POLICY "Users can create approval requests"
  ON public.approval_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = (select auth.uid()));

CREATE POLICY "Admins can update approval requests"
  ON public.approval_requests FOR UPDATE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]))
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]));

CREATE POLICY "Admins can delete approval requests"
  ON public.approval_requests FOR DELETE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text]));

-- ============================================================
-- attendance_records
-- ============================================================
CREATE POLICY "Users can view own attendance records"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text])
  );

CREATE POLICY "Admins can insert attendance records"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]));

CREATE POLICY "Admins can update attendance records"
  ON public.attendance_records FOR UPDATE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]))
  WITH CHECK (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text]));

CREATE POLICY "Admins can delete attendance records"
  ON public.attendance_records FOR DELETE
  TO authenticated
  USING (get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text]));
