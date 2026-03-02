/*
  # Allow Public Read Access on Houses Table

  ## Summary
  Signup form pe houses dropdown empty aa raha tha kyunki unauthenticated users ko
  houses table read karne ki permission nahi thi. Yeh migration ek public SELECT
  policy add karta hai taaki signup form pe house list dikh sake.

  ## Changes
  - `houses` table pe public (anonymous) SELECT policy add kiya
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'houses' AND policyname = 'Anyone can view houses'
  ) THEN
    CREATE POLICY "Anyone can view houses"
      ON houses
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
