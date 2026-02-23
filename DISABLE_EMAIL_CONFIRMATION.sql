/*
  # Disable Email Confirmation Requirement (Auto-confirm all users)

  This script will:
  1. Confirm ALL existing users who aren't confirmed yet
  2. Show you how to disable email confirmation in Supabase settings

  INSTRUCTIONS:
  1. Go to Supabase SQL Editor
  2. Click "New Query"
  3. Copy and paste this script
  4. Click "Run"
*/

-- Confirm ALL users who haven't been confirmed yet
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = '',
  confirmation_sent_at = NULL
WHERE email_confirmed_at IS NULL;

-- Approve all profiles that are pending
UPDATE profiles
SET approval_status = 'approved'
WHERE approval_status = 'pending' OR approval_status IS NULL;

-- Show results
DO $$
DECLARE
  total_users integer;
  confirmed_users integer;
  pending_users integer;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_users
  FROM auth.users;

  -- Count confirmed users
  SELECT COUNT(*) INTO confirmed_users
  FROM auth.users
  WHERE email_confirmed_at IS NOT NULL;

  -- Count pending profiles
  SELECT COUNT(*) INTO pending_users
  FROM profiles
  WHERE approval_status = 'pending';

  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ ALL USERS AUTO-CONFIRMED!';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTICS:';
  RAISE NOTICE '   Total users: %', total_users;
  RAISE NOTICE '   Confirmed users: %', confirmed_users;
  RAISE NOTICE '   Pending approvals: %', pending_users;
  RAISE NOTICE '';
  RAISE NOTICE '📝 NEXT STEPS TO DISABLE EMAIL CONFIRMATION:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Go to Supabase Dashboard:';
  RAISE NOTICE '   https://vlwppdpodavowfnyhtkh.supabase.co/project/vlwppdpodavowfnyhtkh/auth/users';
  RAISE NOTICE '';
  RAISE NOTICE '2. Click "Authentication" in the left sidebar';
  RAISE NOTICE '';
  RAISE NOTICE '3. Click "Providers" tab';
  RAISE NOTICE '';
  RAISE NOTICE '4. Click on "Email" provider';
  RAISE NOTICE '';
  RAISE NOTICE '5. Toggle OFF "Enable email confirmations"';
  RAISE NOTICE '';
  RAISE NOTICE '6. Click "Save"';
  RAISE NOTICE '';
  RAISE NOTICE '✅ After this, new users will NOT need email confirmation!';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
END $$;
