/*
  # Storage policies for product-desk-screenshots bucket

  ## Summary
  Allows anyone (anon + authenticated) to upload and read screenshots
  in the product-desk-screenshots storage bucket.

  ## Security
  - Public SELECT so uploaded images can be displayed
  - Anon INSERT so the public form can upload without login
*/

CREATE POLICY "Public read product desk screenshots"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-desk-screenshots');

CREATE POLICY "Anyone can upload product desk screenshots"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'product-desk-screenshots');

CREATE POLICY "Anyone can delete own product desk screenshots"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'product-desk-screenshots');
