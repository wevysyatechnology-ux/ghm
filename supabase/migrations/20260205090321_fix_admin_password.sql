/*
  # Fix Admin User Password

  1. Purpose
    - Updates the admin user password to ensure proper authentication
    - Fixes any issues with password hashing

  2. Changes
    - Updates encrypted_password for admin@wevysya.com
    - Ensures password is correctly hashed
    - Password: Admin@123

  3. Security
    - Uses bcrypt for secure password hashing
    - Test credentials only - change in production
*/

-- Update the admin user's password
UPDATE auth.users
SET 
  encrypted_password = crypt('Admin@123', gen_salt('bf')),
  updated_at = now()
WHERE email = 'admin@wevysya.com';