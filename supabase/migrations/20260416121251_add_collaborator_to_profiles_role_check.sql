/*
  # Add collaborator to profiles role check constraint

  ## Changes
  - Drops the existing `profiles_role_check` constraint on the `profiles` table
  - Re-creates it with `collaborator` included as a valid role value

  ## Valid roles after this migration
  - member
  - collaborator
  - house_admin
  - zone_admin
  - global_admin
  - super_admin
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('member', 'collaborator', 'house_admin', 'zone_admin', 'global_admin', 'super_admin'));
