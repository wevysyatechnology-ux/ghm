/*
# Sync Member Since through GHM member CRUD

## 1. Purpose
The `member_since` date already exists in both `profiles` and `users_profile`,
but the profile synchronization trigger did not include it. This migration
makes the GHM profile value flow to the mobile profile whenever a member is
created or edited.

## 2. Modified behavior
- Updates `sync_profile_details_to_users_profile()` to copy `member_since`.
- Updates the `profiles` synchronization trigger to run when `member_since`
  changes.
- Backfills existing `users_profile.member_since` values from `profiles`.

## 3. Security
- The existing SECURITY DEFINER synchronization function remains protected by
  a fixed `search_path`.
- No new public RPC is created and no RLS policy is widened.
- `profiles` remains the GHM source of truth for this admin-managed date.

## 4. Important notes
- No table, column, or existing row is deleted, renamed, or type-changed.
- The migration is safe to re-run.
- Member Since remains nullable so imported or newly registered members can
  leave it blank until a Super Admin enters the correct date.
*/

CREATE OR REPLACE FUNCTION public.sync_profile_details_to_users_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.users_profile (
    id,
    email,
    full_name,
    phone_number,
    mobile,
    house_id,
    zone,
    business,
    industry,
    keywords,
    avatar_url,
    company_name,
    introduced_by,
    address,
    date_of_birth,
    marital_status,
    business_category,
    sub_category,
    business_type,
    gst_number,
    website,
    state,
    city,
    membership_status,
    membership_code,
    member_since,
    mobile_app_access
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.full_name,
    NEW.phone_number,
    NEW.mobile,
    NEW.house_id,
    NEW.zone,
    NEW.business,
    NEW.industry,
    NEW.keywords,
    NEW.avatar_url,
    NEW.company_name,
    NEW.introduced_by,
    NEW.address,
    NEW.date_of_birth,
    NEW.marital_status,
    NEW.business_category,
    NEW.sub_category,
    NEW.business_type,
    NEW.gst_number,
    NEW.website,
    NEW.state,
    NEW.city,
    COALESCE(NEW.membership_status, 'active'),
    NEW.membership_code,
    NEW.member_since,
    COALESCE(NEW.mobile_app_access, 'enabled') = 'enabled'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    mobile = EXCLUDED.mobile,
    house_id = EXCLUDED.house_id,
    zone = EXCLUDED.zone,
    business = EXCLUDED.business,
    industry = EXCLUDED.industry,
    keywords = EXCLUDED.keywords,
    avatar_url = EXCLUDED.avatar_url,
    company_name = EXCLUDED.company_name,
    introduced_by = EXCLUDED.introduced_by,
    address = EXCLUDED.address,
    date_of_birth = EXCLUDED.date_of_birth,
    marital_status = EXCLUDED.marital_status,
    business_category = EXCLUDED.business_category,
    sub_category = EXCLUDED.sub_category,
    business_type = EXCLUDED.business_type,
    gst_number = EXCLUDED.gst_number,
    website = EXCLUDED.website,
    state = EXCLUDED.state,
    city = EXCLUDED.city,
    membership_status = EXCLUDED.membership_status,
    membership_code = EXCLUDED.membership_code,
    member_since = EXCLUDED.member_since,
    mobile_app_access = EXCLUDED.mobile_app_access;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_profile_details_to_users_profile ON public.profiles;
CREATE TRIGGER sync_profile_details_to_users_profile
AFTER INSERT OR UPDATE OF
  email,
  full_name,
  phone_number,
  mobile,
  house_id,
  zone,
  business,
  industry,
  keywords,
  avatar_url,
  company_name,
  introduced_by,
  address,
  date_of_birth,
  marital_status,
  business_category,
  sub_category,
  business_type,
  gst_number,
  website,
  state,
  city,
  membership_status,
  membership_code,
  member_since,
  mobile_app_access
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_details_to_users_profile();

UPDATE public.users_profile AS up
SET member_since = p.member_since
FROM public.profiles AS p
WHERE up.id = p.id;
