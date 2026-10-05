/*
# Change membership code prefix from WV- to B

1. Modified Column on `public.profiles`
- `membership_code` default changed from `WV-XXXXXXXX` to `B-XXXXXXXX`.
- New signups will automatically receive codes starting with `B-`.

2. Existing Data
- Existing codes that start with `WV-` are updated to start with `B` instead.
- Codes that already start with `B` (e.g. legacy `B2107`) are left unchanged.

3. Security
- No RLS policy changes.
- Unique index remains in place.
*/

ALTER TABLE public.profiles
  ALTER COLUMN membership_code SET DEFAULT (
    'B-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );

UPDATE public.profiles
SET membership_code = 'B-' || split_part(membership_code, '-', 2)
WHERE membership_code LIKE 'WV-%';
