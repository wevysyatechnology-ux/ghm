/*
  # Remove notification preferences trigger

  1. Problem
    - There's a trigger `on_auth_user_created_notification_prefs` that tries to insert into `notification_preferences` table
    - But `notification_preferences` table doesn't exist
    - This causes signup to fail with "relation notification_preferences does not exist"
    
  2. Solution
    - Drop the trigger
    - Drop the function that references the non-existent table
*/

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;

-- Drop the function that references non-existent table
DROP FUNCTION IF EXISTS create_notification_preferences_for_user();
