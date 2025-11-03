-- ==============================================================
-- 🚀 COMPLETE DATABASE SETUP - SINGLE FILE
-- ==============================================================
-- Run this ONCE in your Supabase SQL Editor
-- This will:
-- 1. Create all tables with proper structure
-- 2. Set up RLS policies
-- 3. Add default categories for ALL existing users
-- 4. Create trigger to auto-add categories for NEW users
-- ==============================================================

-- Clean up old tables and triggers
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS savings_deposits CASCADE;
DROP TABLE IF EXISTS recurring_transactions CASCADE;
DROP TABLE IF EXISTS budget_goals CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_default_categories() CASCADE;
DROP FUNCTION IF EXISTS check_savings_goal_completed() CASCADE;

-- ==============================================================
-- CREATE TABLES
-- ==============================================================

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL DEFAULT 'FileText',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

-- Transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
  description TEXT,
  payment_method TEXT DEFAULT 'upi',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savings goals table
CREATE TABLE savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12, 2) DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savings deposits table
CREATE TABLE savings_deposits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  savings_goal_id UUID REFERENCES savings_goals(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring transactions table
CREATE TABLE recurring_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
  description TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget goals table
CREATE TABLE budget_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id, period)
);

-- ==============================================================
-- CREATE INDEXES
-- ==============================================================

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_savings_deposits_user_id ON savings_deposits(user_id);
CREATE INDEX idx_savings_deposits_goal_id ON savings_deposits(savings_goal_id);
CREATE INDEX idx_savings_deposits_date ON savings_deposits(deposit_date);
CREATE INDEX idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_transactions_active ON recurring_transactions(is_active);
CREATE INDEX idx_budget_goals_user_id ON budget_goals(user_id);
CREATE INDEX idx_budget_goals_category_id ON budget_goals(category_id);

-- ==============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_goals ENABLE ROW LEVEL SECURITY;

-- ==============================================================
-- RLS POLICIES - TRANSACTIONS
-- ==============================================================

CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================
-- RLS POLICIES - CATEGORIES
-- ==============================================================

CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================
-- RLS POLICIES - SAVINGS GOALS
-- ==============================================================

CREATE POLICY "Users can view their own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals"
  ON savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================
-- RLS POLICIES - SAVINGS DEPOSITS
-- ==============================================================

CREATE POLICY "Users can view their own deposits"
  ON savings_deposits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deposits"
  ON savings_deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deposits"
  ON savings_deposits FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================
-- RLS POLICIES - RECURRING TRANSACTIONS
-- ==============================================================

CREATE POLICY "Users can view their own recurring transactions"
  ON recurring_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring transactions"
  ON recurring_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions"
  ON recurring_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions"
  ON recurring_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================
-- RLS POLICIES - BUDGET GOALS
-- ==============================================================

CREATE POLICY "Users can view their own budget goals"
  ON budget_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget goals"
  ON budget_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget goals"
  ON budget_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget goals"
  ON budget_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================
-- FUNCTION: Create default categories for new users
-- ==============================================================

CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert INCOME categories with Lucide icon names
  INSERT INTO categories (user_id, name, type, icon) VALUES
    (NEW.id, 'Salary', 'income', 'Wallet'),
    (NEW.id, 'Freelance', 'income', 'Briefcase'),
    (NEW.id, 'Investments', 'income', 'TrendingUp'),
    (NEW.id, 'Gifts', 'income', 'Gift'),
    (NEW.id, 'Other Income', 'income', 'DollarSign')
  ON CONFLICT (user_id, name, type) DO NOTHING;

  -- Insert EXPENSE categories with Lucide icon names
  INSERT INTO categories (user_id, name, type, icon) VALUES
    (NEW.id, 'Food & Dining', 'expense', 'Utensils'),
    (NEW.id, 'Transport', 'expense', 'Car'),
    (NEW.id, 'Housing', 'expense', 'Home'),
    (NEW.id, 'Healthcare', 'expense', 'Heart'),
    (NEW.id, 'Entertainment', 'expense', 'Film'),
    (NEW.id, 'Shopping', 'expense', 'ShoppingCart'),
    (NEW.id, 'Education', 'expense', 'BookOpen'),
    (NEW.id, 'Utilities', 'expense', 'Wrench'),
    (NEW.id, 'Bills', 'expense', 'Receipt'),
    (NEW.id, 'Other Expenses', 'expense', 'MoreHorizontal')
  ON CONFLICT (user_id, name, type) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating default categories for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================
-- TRIGGER: Auto-create categories for NEW users
-- ==============================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION create_default_categories();

-- ==============================================================
-- FUNCTION: Prevent adding to completed savings goals
-- ==============================================================

CREATE OR REPLACE FUNCTION check_savings_goal_completed()
RETURNS TRIGGER AS $$
DECLARE
  goal_record RECORD;
BEGIN
  -- Get the goal details
  SELECT target_amount, current_amount 
  INTO goal_record
  FROM savings_goals 
  WHERE id = NEW.id;
  
  -- Check if trying to increase amount on a completed goal
  IF goal_record.current_amount >= goal_record.target_amount 
     AND NEW.current_amount > goal_record.current_amount THEN
    RAISE EXCEPTION 'Cannot add money to a completed savings goal. Target already reached!';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to savings_goals table
CREATE TRIGGER prevent_completed_goal_update
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW
  WHEN (OLD.current_amount >= OLD.target_amount)
  EXECUTE FUNCTION check_savings_goal_completed();

-- ==============================================================
-- ADD DEFAULT CATEGORIES TO ALL EXISTING USERS
-- ==============================================================

DO $$
DECLARE
  user_record RECORD;
  categories_added INTEGER := 0;
BEGIN
  -- Loop through ALL existing users
  FOR user_record IN SELECT id, email FROM auth.users LOOP
    -- Insert INCOME categories for this user
    INSERT INTO categories (user_id, name, type, icon) VALUES
      (user_record.id, 'Salary', 'income', 'Wallet'),
      (user_record.id, 'Freelance', 'income', 'Briefcase'),
      (user_record.id, 'Investments', 'income', 'TrendingUp'),
      (user_record.id, 'Gifts', 'income', 'Gift'),
      (user_record.id, 'Other Income', 'income', 'DollarSign')
    ON CONFLICT (user_id, name, type) DO NOTHING;

    -- Insert EXPENSE categories for this user
    INSERT INTO categories (user_id, name, type, icon) VALUES
      (user_record.id, 'Food & Dining', 'expense', 'Utensils'),
      (user_record.id, 'Transport', 'expense', 'Car'),
      (user_record.id, 'Housing', 'expense', 'Home'),
      (user_record.id, 'Healthcare', 'expense', 'Heart'),
      (user_record.id, 'Entertainment', 'expense', 'Film'),
      (user_record.id, 'Shopping', 'expense', 'ShoppingCart'),
      (user_record.id, 'Education', 'expense', 'BookOpen'),
      (user_record.id, 'Utilities', 'expense', 'Wrench'),
      (user_record.id, 'Bills', 'expense', 'Receipt'),
      (user_record.id, 'Other Expenses', 'expense', 'MoreHorizontal')
    ON CONFLICT (user_id, name, type) DO NOTHING;

    categories_added := categories_added + 1;
    RAISE NOTICE '✅ Added categories for user: %', user_record.email;
  END LOOP;

  RAISE NOTICE '🎉 Complete! Added categories for % users', categories_added;
END $$;

-- ==============================================================
-- ENABLE REAL-TIME UPDATES
-- ==============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE savings_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE savings_deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE recurring_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE budget_goals;

-- ==============================================================
-- VERIFICATION QUERIES
-- ==============================================================

-- Show all users and their category counts
SELECT 
  u.email,
  COUNT(c.id) as total_categories,
  SUM(CASE WHEN c.type = 'income' THEN 1 ELSE 0 END) as income_categories,
  SUM(CASE WHEN c.type = 'expense' THEN 1 ELSE 0 END) as expense_categories
FROM auth.users u
LEFT JOIN categories c ON u.id = c.user_id
GROUP BY u.email
ORDER BY u.email;

-- Show sample categories for verification
SELECT 
  c.name,
  c.type,
  c.icon,
  u.email as user_email
FROM categories c
JOIN auth.users u ON c.user_id = u.id
ORDER BY u.email, c.type, c.name
LIMIT 20;

-- Final success message
SELECT '✅ DATABASE SETUP COMPLETE!' as status;
SELECT '🎉 All users now have 15 default categories (5 income + 10 expense)' as message;
SELECT '🔄 New users will automatically get these categories on signup' as note;
SELECT '👤 Users can delete categories later if they want' as user_control;
SELECT '🚀 Refresh your app and try adding transactions!' as next_step;

-- ==============================================================
-- ✅ SETUP COMPLETE!
-- ==============================================================
-- What this script did:
-- 1. ✅ Created all database tables with proper structure
-- 2. ✅ Set up RLS policies for security
-- 3. ✅ Added 15 default categories to ALL existing users
-- 4. ✅ Created trigger to auto-add categories for new users
-- 5. ✅ Enabled real-time updates
-- 6. ✅ Users can delete/modify categories as they wish
--
-- Next steps:
-- 1. Refresh your app (F5)
-- 2. Check console - should see "✅ Categories fetched: 15 categories"
-- 3. Open AI Assistant (Sai)
-- 4. Try: "spent 500 on coffee"
-- 5. Success! 🎉
-- ==============================================================
