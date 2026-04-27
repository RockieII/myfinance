-- MyFinance — Default Categories Seed
-- Run AFTER schema.sql in Supabase SQL Editor.
-- Replace YOUR_USER_ID with your actual auth.users UUID after creating your account.

-- To find your user ID after signing up:
--   SELECT id FROM auth.users LIMIT 1;

-- Expense categories
INSERT INTO categories (user_id, name, type, icon, is_default) VALUES
  ('YOUR_USER_ID', 'Housing',        'expense', 'ph-house',           true),
  ('YOUR_USER_ID', 'Food',           'expense', 'ph-fork-knife',      true),
  ('YOUR_USER_ID', 'Transport',      'expense', 'ph-car',             true),
  ('YOUR_USER_ID', 'Entertainment',  'expense', 'ph-film-strip',      true),
  ('YOUR_USER_ID', 'Health',         'expense', 'ph-heart',           true),
  ('YOUR_USER_ID', 'Education',      'expense', 'ph-graduation-cap',  true),
  ('YOUR_USER_ID', 'Subscriptions',  'expense', 'ph-repeat',          true),
  ('YOUR_USER_ID', 'Shopping',       'expense', 'ph-shopping-bag',    true),
  ('YOUR_USER_ID', 'Utilities',      'expense', 'ph-lightning',       true),
  ('YOUR_USER_ID', 'Other',          'expense', 'ph-dots-three',      true);

-- Income categories
INSERT INTO categories (user_id, name, type, icon, is_default) VALUES
  ('YOUR_USER_ID', 'Salary',      'income', 'ph-wallet',        true),
  ('YOUR_USER_ID', 'Freelance',   'income', 'ph-laptop',        true),
  ('YOUR_USER_ID', 'Investments', 'income', 'ph-chart-line-up', true),
  ('YOUR_USER_ID', 'Gifts',       'income', 'ph-gift',          true),
  ('YOUR_USER_ID', 'Other',       'income', 'ph-dots-three',    true);
