-- ============================================================
-- Location Hierarchy Tables: Countries → States → Zones
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT countries_name_unique UNIQUE (name)
);

-- 2. States table (linked to country)
CREATE TABLE IF NOT EXISTS states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT states_name_country_unique UNIQUE (name, country_id)
);

-- 3. Zones table (linked to state)
CREATE TABLE IF NOT EXISTS zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT zones_name_state_unique UNIQUE (name, state_id)
);

-- Enable Row Level Security
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all authenticated users to read
CREATE POLICY "Authenticated users can read countries"
  ON countries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read states"
  ON states FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read zones"
  ON zones FOR SELECT TO authenticated USING (true);

-- RLS Policies: Only admins can insert/update/delete
CREATE POLICY "Admins can manage countries"
  ON countries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

CREATE POLICY "Admins can manage states"
  ON states FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

CREATE POLICY "Admins can manage zones"
  ON zones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_states_country_id ON states(country_id);
CREATE INDEX IF NOT EXISTS idx_zones_state_id ON zones(state_id);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);
CREATE INDEX IF NOT EXISTS idx_states_name ON states(name);
CREATE INDEX IF NOT EXISTS idx_zones_name ON zones(name);
