/*
  # Add screenshot_urls array column to product_requests

  ## Summary
  Replaces the single `screenshot_url` text column with a `screenshot_urls` text array
  that supports up to 5 screenshots per request.

  ## Changes
  - `product_requests`: Add `screenshot_urls text[] DEFAULT '{}'` column
  - Keep old `screenshot_url` column untouched for backwards compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_requests' AND column_name = 'screenshot_urls'
  ) THEN
    ALTER TABLE product_requests ADD COLUMN screenshot_urls text[] DEFAULT '{}';
  END IF;
END $$;
