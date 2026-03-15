/*
  # Remove Duplicate Permissive Policies

  ## Summary
  Drops the duplicate/redundant permissive policies that conflict with more specific ones.
  Keeps the more restrictive/specific policy and removes the broad duplicate.

  ## Tables Fixed
  - core_deals: remove "Authenticated users can insert core deals" (WITH CHECK true) and
    "Authenticated users can view core deals" (SELECT true) — keep specific ones
  - core_i2we: remove "Authenticated users can insert core i2we" (WITH CHECK true) and
    "Authenticated users can view core i2we" (SELECT true) — keep specific ones
  - core_links: remove "Authenticated users can insert core links" (WITH CHECK true) and
    "Authenticated users can view core links" (SELECT true) — keep specific ones
  - deals: remove "Authenticated users can insert deals" (WITH CHECK true) and
    "Authenticated users can view deals" (SELECT true) — keep specific ones
  - houses: remove "Anyone can view houses" — keep "All authenticated users can view houses"
  - i2we_events: remove "Authenticated users can insert i2we events" (WITH CHECK true) and
    "Authenticated users can view i2we events" (SELECT true) — keep specific ones
  - links: remove "Authenticated users can insert links" (WITH CHECK true) and
    "Authenticated users can view links" (SELECT true) — keep specific ones
  - members: remove "Enable read for authenticated users" — keep "All authenticated users can view members"
  - profiles: remove "Authenticated users can insert own profile" (WITH CHECK true),
    "profiles_select_own" (duplicate of Users can view own profile),
    "profiles_update_own" (duplicate of Users can update own profile)
*/

-- core_deals: drop the always-true duplicates
DROP POLICY IF EXISTS "Authenticated users can insert core deals" ON public.core_deals;
DROP POLICY IF EXISTS "Authenticated users can view core deals" ON public.core_deals;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.core_deals;

-- core_i2we: drop the always-true duplicates
DROP POLICY IF EXISTS "Authenticated users can insert core i2we" ON public.core_i2we;
DROP POLICY IF EXISTS "Authenticated users can view core i2we" ON public.core_i2we;

-- core_links: drop the always-true duplicates
DROP POLICY IF EXISTS "Authenticated users can insert core links" ON public.core_links;
DROP POLICY IF EXISTS "Authenticated users can view core links" ON public.core_links;

-- deals: drop the always-true duplicate INSERT and duplicate SELECT
DROP POLICY IF EXISTS "Authenticated users can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Authenticated users can view deals" ON public.deals;

-- houses: drop the duplicate SELECT
DROP POLICY IF EXISTS "Anyone can view houses" ON public.houses;

-- i2we_events: drop the always-true duplicate INSERT and duplicate SELECT
DROP POLICY IF EXISTS "Authenticated users can insert i2we events" ON public.i2we_events;
DROP POLICY IF EXISTS "Authenticated users can view i2we events" ON public.i2we_events;

-- links: drop the always-true duplicate INSERT and duplicate SELECT
DROP POLICY IF EXISTS "Authenticated users can insert links" ON public.links;
DROP POLICY IF EXISTS "Authenticated users can view links" ON public.links;

-- members: drop the duplicate SELECT
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.members;

-- profiles: drop always-true INSERT duplicates and redundant own-profile policies
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_signup" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
