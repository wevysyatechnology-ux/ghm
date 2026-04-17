/*
  # Allow collaborators to read all GHM data

  ## Changes
  - Updates SELECT policies on core_links, core_i2we, and attendance_records
    to include the 'collaborator' role, granting full read access across the system

  ## Reason
  Collaborators are a view-only role and need visibility into all GHM data.
  They cannot add, edit, or delete any records.
*/

-- core_links
DROP POLICY IF EXISTS "core_links_select" ON core_links;

CREATE POLICY "core_links_select"
  ON core_links
  FOR SELECT
  TO authenticated
  USING (
    (( SELECT auth.uid() AS uid) = from_user_id)
    OR (( SELECT auth.uid() AS uid) = to_user_id)
    OR (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = ( SELECT auth.uid() AS uid)
        AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text])
    ))
    OR (EXISTS (
      SELECT 1 FROM profiles ha
      WHERE ha.id = ( SELECT auth.uid() AS uid)
        AND ha.role = 'house_admin'::text
        AND (
          (EXISTS (SELECT 1 FROM profiles sender WHERE sender.id = core_links.from_user_id AND sender.house_id = ha.house_id))
          OR (EXISTS (SELECT 1 FROM profiles receiver WHERE receiver.id = core_links.to_user_id AND receiver.house_id = ha.house_id))
        )
    ))
  );

-- core_i2we
DROP POLICY IF EXISTS "core_i2we_select" ON core_i2we;

CREATE POLICY "core_i2we_select"
  ON core_i2we
  FOR SELECT
  TO authenticated
  USING (
    (( SELECT auth.uid() AS uid) = member_1_id)
    OR (( SELECT auth.uid() AS uid) = member_2_id)
    OR (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = ( SELECT auth.uid() AS uid)
        AND p.role = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'collaborator'::text])
    ))
    OR (EXISTS (
      SELECT 1 FROM profiles ha
      WHERE ha.id = ( SELECT auth.uid() AS uid)
        AND ha.role = 'house_admin'::text
        AND (
          (EXISTS (SELECT 1 FROM profiles m1 WHERE m1.id = core_i2we.member_1_id AND m1.house_id = ha.house_id))
          OR (EXISTS (SELECT 1 FROM profiles m2 WHERE m2.id = core_i2we.member_2_id AND m2.house_id = ha.house_id))
        )
    ))
  );

-- attendance_records
DROP POLICY IF EXISTS "Users can view own attendance records" ON attendance_records;

CREATE POLICY "Users can view own attendance records"
  ON attendance_records
  FOR SELECT
  TO authenticated
  USING (
    (user_id = ( SELECT auth.uid() AS uid))
    OR (get_user_role(( SELECT auth.uid() AS uid)) = ANY (
      ARRAY['super_admin'::text, 'global_admin'::text, 'house_admin'::text, 'collaborator'::text]
    ))
  );
