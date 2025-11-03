-- =============================================
-- Add Realized Gains Tracking to Portfolio
-- Migration Script - October 27, 2025
-- =============================================

-- Add realized_gains column to portfolio_holdings
-- This tracks profit/loss from sold stocks
ALTER TABLE portfolio_holdings 
ADD COLUMN IF NOT EXISTS realized_gains DECIMAL(15, 2) DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN portfolio_holdings.realized_gains IS 
'Cumulative realized profit/loss from SELL transactions. Formula: SUM((sell_price - avg_buy_price) * quantity_sold)';

-- Create portfolio_transactions table for detailed transaction history
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holding_id UUID REFERENCES portfolio_holdings(id) ON DELETE SET NULL,
  symbol VARCHAR(50) NOT NULL,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'mutual_fund')),
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
  quantity DECIMAL(15, 4) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  realized_gain DECIMAL(15, 2), -- Only for SELL transactions
  avg_price_at_sell DECIMAL(15, 2), -- Average holding price when sold
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user ON portfolio_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_holding ON portfolio_transactions(holding_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_symbol ON portfolio_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_date ON portfolio_transactions(transaction_date);

-- Enable Row Level Security
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolio_transactions
CREATE POLICY "Users can view their own transactions"
  ON portfolio_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON portfolio_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON portfolio_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON portfolio_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to calculate unrealized gains for a holding
CREATE OR REPLACE FUNCTION calculate_unrealized_gain(
  p_quantity DECIMAL,
  p_avg_price DECIMAL,
  p_current_price DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (p_current_price - p_avg_price) * p_quantity;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate unrealized gain percentage
CREATE OR REPLACE FUNCTION calculate_unrealized_gain_percent(
  p_avg_price DECIMAL,
  p_current_price DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  IF p_avg_price = 0 THEN
    RETURN 0;
  END IF;
  RETURN ((p_current_price - p_avg_price) / p_avg_price) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to process BUY transaction
-- Updates quantity and average price using weighted average formula
CREATE OR REPLACE FUNCTION process_buy_transaction(
  p_user_id UUID,
  p_symbol VARCHAR,
  p_asset_type VARCHAR,
  p_name VARCHAR,
  p_quantity DECIMAL,
  p_price DECIMAL,
  p_transaction_date DATE,
  p_sector VARCHAR DEFAULT NULL,
  p_exchange VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_holding_id UUID;
  v_old_quantity DECIMAL;
  v_old_avg_price DECIMAL;
  v_new_quantity DECIMAL;
  v_new_avg_price DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- Check if holding exists
  SELECT id, quantity, purchase_price
  INTO v_holding_id, v_old_quantity, v_old_avg_price
  FROM portfolio_holdings
  WHERE user_id = p_user_id AND symbol = p_symbol
  LIMIT 1;

  IF v_holding_id IS NOT NULL THEN
    -- Calculate new weighted average price
    v_new_quantity := v_old_quantity + p_quantity;
    v_new_avg_price := ((v_old_quantity * v_old_avg_price) + (p_quantity * p_price)) / v_new_quantity;

    -- Update existing holding
    UPDATE portfolio_holdings
    SET 
      quantity = v_new_quantity,
      purchase_price = v_new_avg_price,
      updated_at = NOW()
    WHERE id = v_holding_id;
  ELSE
    -- Insert new holding
    INSERT INTO portfolio_holdings (
      user_id, asset_type, symbol, name, quantity, purchase_price, 
      purchase_date, sector, exchange
    )
    VALUES (
      p_user_id, p_asset_type, p_symbol, p_name, p_quantity, p_price,
      p_transaction_date, p_sector, p_exchange
    )
    RETURNING id INTO v_holding_id;
  END IF;

  -- Record transaction
  INSERT INTO portfolio_transactions (
    user_id, holding_id, symbol, asset_type, transaction_type,
    quantity, price, total_amount, transaction_date
  )
  VALUES (
    p_user_id, v_holding_id, p_symbol, p_asset_type, 'BUY',
    p_quantity, p_price, p_quantity * p_price, p_transaction_date
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process SELL transaction
-- Updates quantity, calculates realized gains, and removes holding if quantity = 0
CREATE OR REPLACE FUNCTION process_sell_transaction(
  p_user_id UUID,
  p_symbol VARCHAR,
  p_quantity DECIMAL,
  p_price DECIMAL,
  p_transaction_date DATE
)
RETURNS UUID AS $$
DECLARE
  v_holding_id UUID;
  v_asset_type VARCHAR;
  v_old_quantity DECIMAL;
  v_avg_price DECIMAL;
  v_new_quantity DECIMAL;
  v_realized_gain DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- Get holding details
  SELECT id, asset_type, quantity, purchase_price
  INTO v_holding_id, v_asset_type, v_old_quantity, v_avg_price
  FROM portfolio_holdings
  WHERE user_id = p_user_id AND symbol = p_symbol
  LIMIT 1;

  IF v_holding_id IS NULL THEN
    RAISE EXCEPTION 'Holding not found for symbol: %', p_symbol;
  END IF;

  IF v_old_quantity < p_quantity THEN
    RAISE EXCEPTION 'Cannot sell % units. Only % units available.', p_quantity, v_old_quantity;
  END IF;

  -- Calculate realized gain/loss
  v_realized_gain := (p_price - v_avg_price) * p_quantity;

  -- Calculate new quantity
  v_new_quantity := v_old_quantity - p_quantity;

  -- Update or delete holding
  IF v_new_quantity = 0 THEN
    -- All units sold - delete holding
    DELETE FROM portfolio_holdings WHERE id = v_holding_id;
  ELSE
    -- Update remaining quantity (average price stays same)
    UPDATE portfolio_holdings
    SET 
      quantity = v_new_quantity,
      realized_gains = COALESCE(realized_gains, 0) + v_realized_gain,
      updated_at = NOW()
    WHERE id = v_holding_id;
  END IF;

  -- Record transaction
  INSERT INTO portfolio_transactions (
    user_id, holding_id, symbol, asset_type, transaction_type,
    quantity, price, total_amount, transaction_date,
    realized_gain, avg_price_at_sell
  )
  VALUES (
    p_user_id, v_holding_id, p_symbol, v_asset_type, 'SELL',
    p_quantity, p_price, p_quantity * p_price, p_transaction_date,
    v_realized_gain, v_avg_price
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- View for portfolio summary with realized and unrealized gains
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT 
  h.user_id,
  h.id AS holding_id,
  h.symbol,
  h.name,
  h.asset_type,
  h.quantity,
  h.purchase_price AS avg_buy_price,
  h.realized_gains,
  p.current_price,
  (h.quantity * h.purchase_price) AS total_invested,
  (h.quantity * COALESCE(p.current_price, h.purchase_price)) AS current_value,
  calculate_unrealized_gain(h.quantity, h.purchase_price, COALESCE(p.current_price, h.purchase_price)) AS unrealized_gain,
  calculate_unrealized_gain_percent(h.purchase_price, COALESCE(p.current_price, h.purchase_price)) AS unrealized_gain_percent,
  (h.realized_gains + calculate_unrealized_gain(h.quantity, h.purchase_price, COALESCE(p.current_price, h.purchase_price))) AS total_gain,
  h.sector,
  h.exchange,
  h.purchase_date,
  p.last_updated AS price_last_updated
FROM portfolio_holdings h
LEFT JOIN portfolio_prices p ON h.symbol = p.symbol;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Realized gains tracking added successfully!';
  RAISE NOTICE '📊 New column: portfolio_holdings.realized_gains';
  RAISE NOTICE '📝 New table: portfolio_transactions (full transaction history)';
  RAISE NOTICE '🔢 New functions: process_buy_transaction(), process_sell_transaction()';
  RAISE NOTICE '📈 New view: portfolio_summary (complete P&L overview)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Usage Examples:';
  RAISE NOTICE '  BUY:  SELECT process_buy_transaction(user_id, ''RELIANCE.NS'', ''stock'', ''Reliance Industries'', 10, 2500, ''2025-01-01'');';
  RAISE NOTICE '  SELL: SELECT process_sell_transaction(user_id, ''RELIANCE.NS'', 5, 2700, ''2025-03-01'');';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to track complete portfolio performance!';
END $$;
