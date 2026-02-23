/*
  # Sync profiles and users_profile on signup

  Updated trigger to insert into both profiles and users_profile tables
  when a new user signs up.
*/

-- Update the trigger function to insert into profiles only
-- Note: users_profile insert is handled by frontend after auth succeeds to avoid breaking auth flow
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
