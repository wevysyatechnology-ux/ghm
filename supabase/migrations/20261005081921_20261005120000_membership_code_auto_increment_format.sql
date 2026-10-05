/*
# Switch membership code to B<auto-increment> format

1. Sequence
- Create `membership_code_seq` starting at 2207 (current max numeric suffix is 2206).
- Each new member gets the next number automatically.

2. Modified Column on `public.profiles`
- `membership_code` default changed to `'B' || nextval('membership_code_seq')::text`.
- New signups will receive codes like B2207, B2208, B2209, ... with NO hyphen.

3. Existing Data
- 62 codes that still have the `B-XXXXXXXX` hyphen format are re-assigned
  the next available sequence numbers (B2207 onward).
- All 1,703 existing `B<numeric>` codes (B2107..B2206) are left unchanged.

4. Security
- No RLS policy changes. Unique index remains in place.
*/

CREATE SEQUENCE IF NOT EXISTS public.membership_code_seq
  START WITH 2207
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  NO CYCLE;

UPDATE public.profiles
SET membership_code = 'B' || nextval('public.membership_code_seq')::text
WHERE membership_code LIKE 'B-%';

ALTER TABLE public.profiles
  ALTER COLUMN membership_code SET DEFAULT (
    'B' || nextval('public.membership_code_seq')::text
  );
