/*
# Add complete membership signup details

1. New Columns on `public.profiles`
- `phone_number`: signup phone number.
- `company_name`: company or business name.
- `introduced_by`: person who introduced the applicant.
- `address`: applicant address.
- `date_of_birth`: optional date of birth.
- `marital_status`: optional marital status.
- `business_category`: primary business category.
- `sub_category`: business sub-category.
- `business_type`: business type selection.
- `gst_number`: optional GST number.
- `website`: optional business website.
- `state`: membership application state.
- `city`: membership application city.

2. Modified Signup Mapping
- The `handle_new_user` trigger now copies all signup metadata into the matching profile row.
- Existing profile data and existing users are preserved; new fields are nullable.

3. Security
- No access policy is changed. Existing profile RLS policies continue to protect these fields.

4. Important Notes
- This migration is additive and safe to re-run.
- Existing `mobile`, `business`, and `industry` columns remain unchanged for compatibility.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS introduced_by text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_category text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sub_category text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;

  IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    INSERT INTO public.profiles (
      id, email, full_name, mobile, phone_number, business, company_name,
      industry, introduced_by, address, date_of_birth, marital_status,
      business_category, sub_category, business_type, gst_number, website,
      state, city, house_id, role, approval_status, auth_user_id
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      COALESCE(NEW.raw_user_meta_data->>'mobile', NEW.raw_user_meta_data->>'phone_number'),
      NEW.raw_user_meta_data->>'phone_number',
      COALESCE(NEW.raw_user_meta_data->>'business', NEW.raw_user_meta_data->>'company_name'),
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'industry',
      NEW.raw_user_meta_data->>'introduced_by',
      NEW.raw_user_meta_data->>'address',
      NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::date,
      NEW.raw_user_meta_data->>'marital_status',
      NEW.raw_user_meta_data->>'business_category',
      NEW.raw_user_meta_data->>'sub_category',
      NEW.raw_user_meta_data->>'business_type',
      NEW.raw_user_meta_data->>'gst_number',
      NEW.raw_user_meta_data->>'website',
      NEW.raw_user_meta_data->>'state',
      NEW.raw_user_meta_data->>'city',
      NULLIF(NEW.raw_user_meta_data->>'house_id', '')::uuid,
      'member',
      'pending',
      NEW.id
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.users_profile (
      id, full_name, phone_number, business_category, attendance_status,
      absence_count, is_suspended, membership_status
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.raw_user_meta_data->>'mobile'),
      COALESCE(NEW.raw_user_meta_data->>'business_category', NEW.raw_user_meta_data->>'business'),
      'normal', 0, false, 'active'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
