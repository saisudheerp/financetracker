-- =============================================
-- Portfolio Tracker Database Setup
-- For SpendsIn Finance Tracker
-- =============================================

-- Create portfolio_holdings table
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'mutual_fund')),
  symbol VARCHAR(50) NOT NULL, -- Stock ticker (e.g., RELIANCE.NS) or MF code
  name VARCHAR(200) NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL,
  purchase_price DECIMAL(15, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  sector VARCHAR(100),
  exchange VARCHAR(10), -- NSE, BSE, or null for mutual funds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create portfolio_prices table (cache for latest prices)
CREATE TABLE IF NOT EXISTS portfolio_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(50) NOT NULL UNIQUE,
  asset_type VARCHAR(20) NOT NULL,
  current_price DECIMAL(15, 2) NOT NULL,
  previous_close DECIMAL(15, 2),
  change_percent DECIMAL(10, 2),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create portfolio_history table (for charts)
CREATE TABLE IF NOT EXISTS portfolio_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_value DECIMAL(15, 2) NOT NULL,
  total_invested DECIMAL(15, 2) NOT NULL,
  gain_loss DECIMAL(15, 2) NOT NULL,
  gain_loss_percent DECIMAL(10, 2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create portfolio_alerts table
CREATE TABLE IF NOT EXISTS portfolio_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id UUID NOT NULL REFERENCES portfolio_holdings(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'price_change', 'target_reached', etc.
  message TEXT NOT NULL,
  change_percent DECIMAL(10, 2),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user ON portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_history_user ON portfolio_history(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_alerts_user ON portfolio_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_prices_symbol ON portfolio_prices(symbol);

-- Enable Row Level Security
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio_holdings
CREATE POLICY "Users can view their own holdings"
  ON portfolio_holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holdings"
  ON portfolio_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings"
  ON portfolio_holdings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings"
  ON portfolio_holdings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for portfolio_history
CREATE POLICY "Users can view their own history"
  ON portfolio_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
  ON portfolio_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for portfolio_alerts
CREATE POLICY "Users can view their own alerts"
  ON portfolio_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
  ON portfolio_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON portfolio_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
  ON portfolio_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for portfolio_prices (allow all authenticated users to read and write)
CREATE POLICY "All users can view prices"
  ON portfolio_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All users can insert prices"
  ON portfolio_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All users can update prices"
  ON portfolio_prices FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "All users can delete prices"
  ON portfolio_prices FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_portfolio_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for portfolio_holdings
CREATE TRIGGER update_portfolio_holdings_timestamp
  BEFORE UPDATE ON portfolio_holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_timestamp();

-- Function to record portfolio snapshot
CREATE OR REPLACE FUNCTION record_portfolio_snapshot(
  p_user_id UUID,
  p_total_value DECIMAL,
  p_total_invested DECIMAL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO portfolio_history (user_id, total_value, total_invested, gain_loss, gain_loss_percent)
  VALUES (
    p_user_id,
    p_total_value,
    p_total_invested,
    p_total_value - p_total_invested,
    CASE 
      WHEN p_total_invested > 0 THEN ((p_total_value - p_total_invested) / p_total_invested) * 100
      ELSE 0
    END
  );
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Portfolio Tracker tables created successfully!';
  RAISE NOTICE '📊 Tables: portfolio_holdings, portfolio_prices, portfolio_history, portfolio_alerts';
  RAISE NOTICE '🔒 Row Level Security enabled';
  RAISE NOTICE '🚀 Ready to track your investments!';
END $$;
