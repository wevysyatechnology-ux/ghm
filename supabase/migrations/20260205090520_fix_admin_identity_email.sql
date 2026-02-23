/*
  # Fix Admin User Identity Email

  1. Issue
    - auth.users has email: admin@wevysya.com
    - auth.identities has email: reachus@wevysya.com
    - Mismatch causes authentication to fail

  2. Changes
    - Update identity_data to match auth.users email
    - Ensures authentication works correctly

  3. Security
    - Corrects identity provider data
    - Maintains data integrity between auth tables
*/

-- Update the identity email to match the users table
UPDATE auth.identities
SET 
  identity_data = jsonb_set(
    identity_data,
    '{email}',
    to_jsonb('admin@wevysya.com'::text)
  ),
  updated_at = now()
WHERE user_id = '62e83cea-c824-47ba-af88-d93f3ba3e35c'
AND provider = 'email';