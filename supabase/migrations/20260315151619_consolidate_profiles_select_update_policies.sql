/*
  # Consolidate Profiles SELECT and UPDATE Policies

  ## Summary
  Merges the multiple permissive SELECT policies on profiles into a single unified policy,
  and the two UPDATE policies into one. Multiple permissive policies cause performance
  overhead as Postgres evaluates all of them using OR logic.

  ## Changes
  - SELECT: Replaces "Admins can view all profiles", "Users can view own profile",
    and "Users can view profiles in same house" with a single combined policy.
  - UPDATE: Replaces "Admins can update any profile" and "Users can update own profile"
    with a single combined policy.
*/

-- Drop the three separate SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same house" ON public.profiles;

-- Create one consolidated SELECT policy
CREATE POLICY "Users and admins can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth_user_id = (select auth.uid())
    OR (house_id IS NOT NULL AND house_id = get_my_house_id())
    OR get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text, 'zone_admin'::text, 'house_admin'::text])
  );

-- Drop the two separate UPDATE policies
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create one consolidated UPDATE policy
CREATE POLICY "Users and admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = (select auth.uid())
    OR get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text])
  )
  WITH CHECK (
    auth_user_id = (select auth.uid())
    OR get_user_role((select auth.uid())) = ANY (ARRAY['super_admin'::text, 'global_admin'::text])
  );
