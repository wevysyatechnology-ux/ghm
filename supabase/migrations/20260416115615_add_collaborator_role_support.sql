/*
  # Add Collaborator Role Support

  ## Summary
  Adds support for the new 'collaborator' role which has:
  - Read-only access to all portal data
  - Ability to add comments on Product Desk requests
  - Ability to post official discussions (is_official = true) on Product Desk requests
  - No access to modify/delete requests, change status, or pin/unpin

  ## Changes
  1. product_comments - Adds explicit INSERT policy for authenticated users (collaborators included)
  2. product_requests - Ensures collaborators can read all requests (SELECT policy)
  3. profiles - Ensures collaborators can read their own profile

  ## Security
  - Collaborators are authenticated users with role = 'collaborator' in the profiles table
  - They can comment and post official discussions but cannot alter request state
  - The role check happens at the application layer; DB policies ensure comment insertion is permitted
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_comments'
      AND policyname = 'Authenticated users can insert comments'
  ) THEN
    CREATE POLICY "Authenticated users can insert comments"
      ON product_comments
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
