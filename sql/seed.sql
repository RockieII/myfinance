-- MyFinance — Default Categories Seed
-- Run AFTER schema.sql, once you've created your account
-- (Supabase Dashboard → Authentication → Users → Add user).
--
-- Self-resolving + idempotent:
--   • Looks up your user automatically — no UUID or email to edit.
--   • Safe to run more than once — it never creates duplicates.
--   • Assumes a single-user setup (this app is login-only, one account).
--     If you ever have multiple auth users, it seeds the first-created one.

DO $$
DECLARE
  uid       uuid;
  n_before  int;
  n_after   int;
BEGIN
  -- Resolve the account: the only / first-created auth user.
  SELECT id INTO uid FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION
      'No user in auth.users — create your account first (Dashboard → Authentication → Users), then re-run.';
  END IF;

  SELECT count(*) INTO n_before FROM categories WHERE user_id = uid AND is_default;

  -- Insert each default only if this user doesn't already have it (name + type).
  INSERT INTO categories (user_id, name, type, icon, is_default)
  SELECT uid, c.name, c.type, c.icon, true
  FROM (VALUES
    ('Housing',       'expense', 'ph-house'),
    ('Food',          'expense', 'ph-fork-knife'),
    ('Transport',     'expense', 'ph-car'),
    ('Entertainment', 'expense', 'ph-film-strip'),
    ('Health',        'expense', 'ph-heart'),
    ('Education',     'expense', 'ph-graduation-cap'),
    ('Subscriptions', 'expense', 'ph-repeat'),
    ('Shopping',      'expense', 'ph-shopping-bag'),
    ('Utilities',     'expense', 'ph-lightning'),
    ('Other',         'expense', 'ph-dots-three'),
    ('Salary',        'income',  'ph-wallet'),
    ('Freelance',     'income',  'ph-laptop'),
    ('Investments',   'income',  'ph-chart-line-up'),
    ('Gifts',         'income',  'ph-gift'),
    ('Other',         'income',  'ph-dots-three')
  ) AS c(name, type, icon)
  WHERE NOT EXISTS (
    SELECT 1 FROM categories x
    WHERE x.user_id = uid AND x.name = c.name AND x.type = c.type
  );

  SELECT count(*) INTO n_after FROM categories WHERE user_id = uid AND is_default;
  RAISE NOTICE 'Seed done for %: % default categories (added %).', uid, n_after, n_after - n_before;
END $$;
