/*
  # Clean up duplicate profiles SELECT policy

  Earlier work in this session (20260709100000 / 20260709101000) recreated
  "Admins can view all profiles" without realizing the schema had already
  moved on: migration 20260417085603_allow_collaborator_read_all_profiles
  replaced it with "Users and admins can view profiles", which already
  grants collaborators (and everyone else who needs it) read access to all
  profiles. The two policies ended up redundant (both permissive SELECT
  policies covering the same ground). Drop the duplicate.
*/

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
