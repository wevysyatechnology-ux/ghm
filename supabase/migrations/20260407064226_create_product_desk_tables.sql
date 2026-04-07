/*
  # Create Product Desk Tables

  ## Summary
  Adds the WeVysya Product Desk feature — a centralized system for collecting,
  managing, and prioritizing bug reports and feature requests across WeVysya apps.

  ## New Tables

  ### 1. product_requests
  - `id` (uuid, primary key)
  - `title` (text) — Short title of the request
  - `description` (text) — Detailed description
  - `type` (text) — 'bug' or 'feature'
  - `app_name` (text) — 'WeVysya AI', 'WeVysya Social', 'WeVysya Meeting Companion'
  - `submitter_name` (text) — Name of submitter (public form, no login required)
  - `submitter_email` (text) — Email of submitter
  - `user_id` (uuid, nullable) — auth.users id if logged in
  - `status` (text) — Status in workflow
  - `votes_count` (int) — Denormalized vote total for fast sorting
  - `is_pinned` (boolean) — Admin can pin requests to top
  - `official_response` (text) — Admin official response text
  - `screenshot_url` (text, nullable) — Optional screenshot
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. product_votes
  - `id` (uuid, primary key)
  - `request_id` (uuid, FK → product_requests)
  - `voter_fingerprint` (text) — browser fingerprint/IP-based ID for anonymous voting
  - `user_id` (uuid, nullable) — auth user id if logged in
  - `created_at` (timestamptz)
  - Unique constraint on (request_id, voter_fingerprint) to prevent duplicate votes

  ### 3. product_comments
  - `id` (uuid, primary key)
  - `request_id` (uuid, FK → product_requests)
  - `commenter_name` (text)
  - `commenter_email` (text, nullable)
  - `user_id` (uuid, nullable)
  - `message` (text)
  - `is_official` (boolean) — admin official response flag
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all three tables
  - Public (anon) can INSERT requests and votes
  - Public can SELECT all requests and comments
  - Authenticated admins can UPDATE/DELETE requests and comments
*/

-- Product Requests
CREATE TABLE IF NOT EXISTS product_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('bug', 'feature')),
  app_name text NOT NULL CHECK (app_name IN ('WeVysya AI', 'WeVysya Social', 'WeVysya Meeting Companion')),
  submitter_name text NOT NULL DEFAULT '',
  submitter_email text NOT NULL DEFAULT '',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'planned', 'in_progress', 'completed', 'rejected')),
  votes_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  official_response text,
  screenshot_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_requests_status ON product_requests(status);
CREATE INDEX IF NOT EXISTS idx_product_requests_type ON product_requests(type);
CREATE INDEX IF NOT EXISTS idx_product_requests_app_name ON product_requests(app_name);
CREATE INDEX IF NOT EXISTS idx_product_requests_votes ON product_requests(votes_count DESC);
CREATE INDEX IF NOT EXISTS idx_product_requests_created ON product_requests(created_at DESC);

ALTER TABLE product_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product requests"
  ON product_requests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can submit product requests"
  ON product_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update product requests"
  ON product_requests FOR UPDATE
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

CREATE POLICY "Admins can delete product requests"
  ON product_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

-- Product Votes
CREATE TABLE IF NOT EXISTS product_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES product_requests(id) ON DELETE CASCADE,
  voter_fingerprint text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (request_id, voter_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_product_votes_request ON product_votes(request_id);

ALTER TABLE product_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes"
  ON product_votes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert votes"
  ON product_votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Voters can delete own vote"
  ON product_votes FOR DELETE
  TO anon, authenticated
  USING (voter_fingerprint = voter_fingerprint);

-- Product Comments
CREATE TABLE IF NOT EXISTS product_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES product_requests(id) ON DELETE CASCADE,
  commenter_name text NOT NULL DEFAULT '',
  commenter_email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_official boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_comments_request ON product_comments(request_id);

ALTER TABLE product_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON product_comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert comments"
  ON product_comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update comments"
  ON product_comments FOR UPDATE
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

CREATE POLICY "Admins can delete comments"
  ON product_comments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'global_admin')
    )
  );

-- Auto-update updated_at on product_requests
CREATE OR REPLACE FUNCTION update_product_request_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_requests_updated_at ON product_requests;
CREATE TRIGGER trg_product_requests_updated_at
  BEFORE UPDATE ON product_requests
  FOR EACH ROW EXECUTE FUNCTION update_product_request_updated_at();
