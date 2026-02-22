/*
  Fix RLS policies on services and barbers tables to allow anonymous (anon) access.
  These are public catalog data that should be viewable without authentication.
*/

-- Fix services policy: allow anon users to view active services
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Fix barbers policy: allow anon users to view active barbers
DROP POLICY IF EXISTS "Anyone can view active barbers" ON barbers;
CREATE POLICY "Anyone can view active barbers"
  ON barbers FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Also fix products policy for consistency
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (active = true);
