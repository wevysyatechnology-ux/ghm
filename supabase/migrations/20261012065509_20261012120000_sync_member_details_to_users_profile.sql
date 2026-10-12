/*
# Mirror GHM member details into users_profile

## 1. Purpose
The GHM admin portal stores the complete member record in `profiles`, while the
mobile application reads member information from `users_profile`. Previously,
only membership status, mobile-app access, and membership code were synchronized.
This migration keeps the two records aligned for all normal member details.

## 2. New users_profile columns
The following nullable columns mirror the corresponding `profiles` values:
- `email`, `house_id`, `zone`, `business`, `industry`, `keywords`
- `avatar_url`, `mobile`, `company_name`, `introduced_by`, `address`
- `date_of_birth`, `marital_status`, `sub_category`, `business_type`
- `gst_number`, `website`

Existing columns such as `full_name`, `phone_number`, `country`, `state`,
`city`, `business_category`, and `membership_code` are reused.

## 3. Synchronization behavior
- Adds `sync_profile_details_to_users_profile()` as a SECURITY DEFINER function.
- Adds a trigger on `profiles` for inserts and changes to member-detail columns.
- Add, import, edit, and signup flows all write to `profiles`, so the trigger
  mirrors those values into the matching `users_profile` row automatically.
- Existing users_profile rows are backfilled from their current profiles row.
- Mobile-app-specific fields such as attendance counters, suspension state,
  consent, and profile-photo metadata are not overwritten by this sync.

## 4. Security
- The synchronization function uses a fixed `search_path`.
- It runs only as a database trigger; no new public RPC permission is granted.
- `profiles` remains the GHM source of truth for these mirrored member details.
- No rows or existing columns are deleted, renamed, or type-changed.

## 5. Important notes
- The migration is additive and safe to re-run.
- `mobile_app_access`, `membership_status`, and `membership_code` continue to
  use their existing dedicated synchronization triggers and mappings.
*/

ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS house_id uuid;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS zone text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS business text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS keywords text[];
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS introduced_by text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS sub_category text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS website text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_profile_house_id_fkey'
      AND conrelid = 'public.users_profile'::regclass
  ) THEN
    ALTER TABLE public.users_profile
      ADD CONSTRAINT users_profile_house_id_fkey
      FOREIGN KEY (house_id) REFERENCES public.houses(id);
  END IF;
END $$;

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
  mobile_app_access
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_details_to_users_profile();

UPDATE public.users_profile AS up
SET
  email = p.email,
  full_name = p.full_name,
  phone_number = p.phone_number,
  mobile = p.mobile,
  house_id = p.house_id,
  zone = p.zone,
  business = p.business,
  industry = p.industry,
  keywords = p.keywords,
  avatar_url = p.avatar_url,
  company_name = p.company_name,
  introduced_by = p.introduced_by,
  address = p.address,
  date_of_birth = p.date_of_birth,
  marital_status = p.marital_status,
  business_category = p.business_category,
  sub_category = p.sub_category,
  business_type = p.business_type,
  gst_number = p.gst_number,
  website = p.website,
  state = p.state,
  city = p.city,
  membership_status = p.membership_status,
  membership_code = p.membership_code,
  mobile_app_access = COALESCE(p.mobile_app_access, 'enabled') = 'enabled'
FROM public.profiles AS p
WHERE up.id = p.id;

GRANT EXECUTE ON FUNCTION public.sync_profile_details_to_users_profile() TO service_role;
REVOKE EXECUTE ON FUNCTION public.sync_profile_details_to_users_profile() FROM PUBLIC, anon, authenticated;
