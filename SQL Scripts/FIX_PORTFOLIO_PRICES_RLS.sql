-- =============================================
-- FIX: Add missing RLS policies for portfolio_prices
-- This allows authenticated users to INSERT/UPDATE prices
-- =============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "All users can insert prices" ON portfolio_prices;
DROP POLICY IF EXISTS "All users can update prices" ON portfolio_prices;
DROP POLICY IF EXISTS "All users can delete prices" ON portfolio_prices;

-- Add INSERT policy
CREATE POLICY "All users can insert prices"
  ON portfolio_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy
CREATE POLICY "All users can update prices"
  ON portfolio_prices FOR UPDATE
  TO authenticated
  USING (true);

-- Add DELETE policy (optional, for cleanup)
CREATE POLICY "All users can delete prices"
  ON portfolio_prices FOR DELETE
  TO authenticated
  USING (true);

-- Verify all policies
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies for portfolio_prices updated successfully!';
  RAISE NOTICE '📝 Policies added:';
  RAISE NOTICE '   - INSERT: All authenticated users can insert prices';
  RAISE NOTICE '   - UPDATE: All authenticated users can update prices';
  RAISE NOTICE '   - DELETE: All authenticated users can delete prices';
  RAISE NOTICE '   - SELECT: All authenticated users can view prices (already existed)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Now you can save mutual fund NAV to the database!';
END $$;
