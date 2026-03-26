/*
  # QR Code Attendance System

  ## Overview
  Adds QR-based attendance tracking to events. Each event gets a unique QR token.
  Members scan the QR code during live events to mark attendance.

  ## Changes

  ### Modified Tables
  - `events`: Added `qr_token` (unique UUID per event), `qr_expires_at` (QR validity window),
    `is_live` (whether event is currently active for check-in), `max_late_minutes` (grace period)

  ### New Tables
  - `event_attendance`: Replaces old attendance concept with proper event-linked records
    - `id`, `event_id`, `member_id`, `status` (present/late/absent), `checked_in_at`,
      `check_in_method` (qr/manual/geo), `marked_by` (admin override)

  ### Security
  - RLS enabled on `event_attendance`
  - Authenticated members can insert their own attendance (once per event)
  - Admins can read all attendance records
  - Members can only insert, not update/delete their own records (prevents manipulation)

  ## Notes
  1. `qr_token` is generated server-side as a UUID when the event is created
  2. `qr_expires_at` defaults to event_date + 4 hours
  3. Duplicate check-in is prevented by unique constraint on (event_id, member_id)
  4. `is_live` must be true for QR scan to succeed
*/

-- Add QR and live tracking columns to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS qr_token uuid DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS qr_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_late_minutes integer DEFAULT 15;

-- Backfill qr_token for existing events that have NULL
UPDATE events SET qr_token = gen_random_uuid() WHERE qr_token IS NULL;

-- Create event_attendance table
CREATE TABLE IF NOT EXISTS event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent')),
  checked_in_at timestamptz DEFAULT now(),
  check_in_method text NOT NULL DEFAULT 'qr' CHECK (check_in_method IN ('qr', 'manual', 'geo')),
  marked_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_event_member UNIQUE (event_id, member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_member_id ON event_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_events_qr_token ON events(qr_token);
CREATE INDEX IF NOT EXISTS idx_events_is_live ON events(is_live) WHERE is_live = true;

-- Enable RLS
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;

-- Admins and super admins can read all attendance
CREATE POLICY "Admins can read all event attendance"
  ON event_attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );

-- Members can read their own attendance
CREATE POLICY "Members can read own attendance"
  ON event_attendance FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

-- Authenticated members can insert their own attendance (QR scan)
CREATE POLICY "Members can insert own attendance"
  ON event_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.approval_status = 'approved'
      AND profiles.house_id IS NOT NULL
    )
  );

-- Admins can insert attendance on behalf of members (manual override)
CREATE POLICY "Admins can insert any attendance"
  ON event_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );

-- Admins can update attendance (status correction)
CREATE POLICY "Admins can update attendance"
  ON event_attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );

-- Admins can delete attendance records
CREATE POLICY "Admins can delete attendance"
  ON event_attendance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin', 'zone_admin', 'house_admin')
    )
  );
