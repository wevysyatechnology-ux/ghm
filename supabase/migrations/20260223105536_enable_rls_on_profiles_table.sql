/*
  # Enable RLS on profiles table

  1. Root Cause
    - RLS was DISABLED on profiles table (rowsecurity = false)
    - Trigger function runs with SECURITY DEFINER but RLS policies exist without RLS being enabled
    - This causes INSERT to fail during signup
    
  2. Solution
    - Enable RLS on profiles table
    - Keep existing INSERT policies that allow signup
    
  3. Security
    - RLS is now enabled
    - Existing policies will control access:
      - Anonymous/authenticated users can INSERT (for signup)
      - Users can SELECT/UPDATE their own profile
      - Admins can view/update all profiles
*/

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
