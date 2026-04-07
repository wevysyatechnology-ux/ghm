/*
  # Add function to check emails against auth.users

  ## Purpose
  The import pre-check queries `profiles` for duplicate detection, but some users
  exist in `auth.users` without a matching `profiles` row (128 such users found).
  This causes the edge function to fail with "already registered" during import.

  ## Changes
  - Creates `check_emails_in_auth(emails text[])` function with SECURITY DEFINER
    so authenticated users can check whether emails are already registered in auth,
    without exposing any other auth data.
  - Returns only the emails from the input array that already exist in auth.users.
*/

CREATE OR REPLACE FUNCTION check_emails_in_auth(emails text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_emails text[];
BEGIN
  SELECT ARRAY_AGG(LOWER(u.email))
  INTO found_emails
  FROM auth.users u
  WHERE LOWER(u.email) = ANY(
    SELECT LOWER(e) FROM UNNEST(emails) e
  );

  RETURN COALESCE(found_emails, ARRAY[]::text[]);
END;
$$;

GRANT EXECUTE ON FUNCTION check_emails_in_auth(text[]) TO authenticated;
