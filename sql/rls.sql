-- MyFinance — Row Level Security Policies
-- Run AFTER schema.sql in Supabase SQL Editor.
-- These ensure each user can only access their own data.

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own accounts"
  ON accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Stocks
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stocks"
  ON stocks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Stock prices — shared cache, any authenticated user can read/write
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage stock prices"
  ON stock_prices FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
