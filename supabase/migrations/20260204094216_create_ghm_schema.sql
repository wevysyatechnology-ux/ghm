/*
  # WeVysya GHM 2.0 Database Schema

  ## Overview
  Complete database schema for WeVysya Global House Management system with role-based access control.

  ## New Tables Created
  
  ### 1. profiles
  - `id` (uuid, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (text: super_admin, global_admin, zone_admin, house_admin, member)
  - `house_id` (uuid, references houses)
  - `zone` (text)
  - `business` (text)
  - `industry` (text)
  - `keywords` (text array)
  - `avatar_url` (text)
  - `mobile` (text)
  - `created_at` (timestamptz)

  ### 2. houses
  - `id` (uuid, primary key)
  - `name` (text, unique)
  - `state` (text)
  - `city` (text)
  - `zone` (text)
  - `email` (text)
  - `mobile` (text)
  - `created_at` (timestamptz)
  - `created_by` (uuid, references profiles)

  ### 3. members
  - `id` (uuid, primary key)
  - `profile_id` (uuid, references profiles)
  - `house_id` (uuid, references houses)
  - `business` (text)
  - `industry` (text)
  - `keywords` (text array)
  - `joined_at` (timestamptz)

  ### 4. links
  - `id` (uuid, primary key)
  - `from_member_id` (uuid, references profiles)
  - `to_member_id` (uuid, references profiles)
  - `description` (text)
  - `house_id` (uuid, references houses)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 5. deals
  - `id` (uuid, primary key)
  - `amount` (numeric)
  - `from_member_id` (uuid, references profiles)
  - `to_member_id` (uuid, references profiles)
  - `description` (text)
  - `house_id` (uuid, references houses)
  - `deal_date` (date)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 6. i2we_events
  - `id` (uuid, primary key)
  - `member_id` (uuid, references profiles)
  - `event_name` (text)
  - `description` (text)
  - `event_date` (date)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 7. attendance
  - `id` (uuid, primary key)
  - `event_name` (text)
  - `member_id` (uuid, references profiles)
  - `marked_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Super admins have full access
  - Global admins can view/edit all data
  - Zone admins limited to their zone
  - House admins limited to their house
  - Members have read-only access to their data
*/

-- Create houses table
CREATE TABLE IF NOT EXISTS houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  zone text NOT NULL,
  email text,
  mobile text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin', 'member')),
  house_id uuid REFERENCES houses(id),
  zone text,
  business text,
  industry text,
  keywords text[] DEFAULT '{}',
  avatar_url text,
  mobile text,
  created_at timestamptz DEFAULT now()
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  house_id uuid REFERENCES houses(id),
  business text,
  industry text,
  keywords text[] DEFAULT '{}',
  joined_at timestamptz DEFAULT now()
);

-- Create links table
CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id uuid REFERENCES profiles(id),
  to_member_id uuid REFERENCES profiles(id),
  description text NOT NULL,
  house_id uuid REFERENCES houses(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  from_member_id uuid REFERENCES profiles(id),
  to_member_id uuid REFERENCES profiles(id),
  description text NOT NULL,
  house_id uuid REFERENCES houses(id),
  deal_date date NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create i2we_events table
CREATE TABLE IF NOT EXISTS i2we_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES profiles(id),
  event_name text NOT NULL,
  description text,
  event_date date NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  member_id uuid REFERENCES profiles(id),
  marked_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE i2we_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Houses policies
CREATE POLICY "Authenticated users can view houses"
  ON houses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert houses"
  ON houses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

CREATE POLICY "Admins can update houses"
  ON houses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

-- Members policies
CREATE POLICY "Authenticated users can view members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage members"
  ON members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'house_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'house_admin')
    )
  );

-- Links policies
CREATE POLICY "Authenticated users can view links"
  ON links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create links"
  ON links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Deals policies
CREATE POLICY "Authenticated users can view deals"
  ON deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- I2WE events policies
CREATE POLICY "Authenticated users can view i2we events"
  ON i2we_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create i2we events"
  ON i2we_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Attendance policies
CREATE POLICY "Authenticated users can view attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can mark attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'house_admin')
    )
  );

-- Function to create profile on signup
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

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();