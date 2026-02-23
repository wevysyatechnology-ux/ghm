/*
  # Confirm Email for User

  This will confirm the email for ak.420sumit@gmail.com so they can login.

  INSTRUCTIONS:
  1. Go to Supabase SQL Editor
  2. Click "New Query"
  3. Copy and paste this script
  4. Click "Run"
*/

-- Confirm the email for the user
UPDATE auth.users
SET
  email_confirmed_at = now(),
  confirmation_token = '',
  confirmation_sent_at = NULL
WHERE email = 'ak.420sumit@gmail.com';

-- Also update their profile to be approved
UPDATE profiles
SET approval_status = 'approved'
WHERE email = 'ak.420sumit@gmail.com';

-- Verify the update
DO $$
DECLARE
  user_confirmed boolean;
  user_role text;
  user_status text;
BEGIN
  -- Check if email is confirmed
  SELECT
    email_confirmed_at IS NOT NULL,
    p.role,
    p.approval_status
  INTO user_confirmed, user_role, user_status
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  WHERE u.email = 'ak.420sumit@gmail.com';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  IF user_confirmed THEN
    RAISE NOTICE '✅ Email confirmed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Email: ak.420sumit@gmail.com';
    RAISE NOTICE '👤 Role: %', user_role;
    RAISE NOTICE '✓ Status: %', user_status;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 User can now login!';
  ELSE
    RAISE NOTICE '❌ User not found or email not confirmed';
  END IF;
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
