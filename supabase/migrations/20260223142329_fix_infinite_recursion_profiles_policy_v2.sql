/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - "Admins can view all profiles" policy has infinite recursion
    - It queries profiles table to check if user is admin
    - This causes the policy to call itself recursively
    
  2. Solution
    - Create a SECURITY DEFINER function in public schema that bypasses RLS
    - Use this function to check user role without triggering recursion
    - Update the admin policy to use this function
*/

-- Create a secure function to get user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = user_id LIMIT 1;
$$;

-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Recreate admin policy using the secure function
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin')
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, anon;
