# MyFinance — Migrations ledger

Every schema change is **additive and reversible**. Each entry has an **UP** (applied) and a **DOWN**
(rollback). New columns are nullable / defaulted so existing data and the pre-platform app keep working.
Run via the Supabase SQL editor or MCP `apply_migration`.

Rollback order is the reverse of application order.

---

## 001 — categories.color  (Phase 1)
Adds a per-category color so categories are customizable and visuals can use real colors.
Existing default categories get a curated palette; all others fall back to the column default.

**UP**
```sql
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#6B7280';

-- Curated palette for the built-in defaults (safe: only touches is_default rows).
UPDATE categories SET color = c.color FROM (VALUES
  ('Housing','#6366F1'), ('Food','#F59E0B'), ('Transport','#0EA5E9'),
  ('Entertainment','#EC4899'), ('Health','#EF4444'), ('Education','#8B5CF6'),
  ('Subscriptions','#14B8A6'), ('Shopping','#F97316'), ('Utilities','#EAB308'),
  ('Salary','#1E7F5C'), ('Freelance','#22C55E'), ('Investments','#10B981'),
  ('Gifts','#A855F7')
) AS c(name,color)
WHERE categories.is_default AND categories.name = c.name;
```

**DOWN**
```sql
ALTER TABLE categories DROP COLUMN IF EXISTS color;
```

---

## 002 — profiles + transactions.profile_id  (Phase 2)
Lets one account hold multiple people (e.g. a couple). Profiles are attribution tags inside a single
auth user; accounts/categories/stocks stay shared. `profile_id` is **nullable** (NULL = shared/unassigned),
so all existing data and the pre-profiles flow keep working. RLS stays keyed on `user_id` — no security change.

**UP**
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#1E7F5C',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profiles" ON profiles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
```

**DOWN**
```sql
ALTER TABLE transactions DROP COLUMN IF EXISTS profile_id;
DROP TABLE IF EXISTS profiles;   -- RLS policy + index drop with the table
```

---

## 003 — dashboards  (Phase 3)
User-composable dashboard pages. Each row is one page; its widgets + grid sizes live in `layout jsonb`
(an ordered array of `{ id, type, w, h }`). Purely additive — the pre-platform dashboard ignores this table.

**UP**
```sql
CREATE TABLE IF NOT EXISTS dashboards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'My dashboard',
  theme      text NOT NULL DEFAULT 'default',
  layout     jsonb NOT NULL DEFAULT '[]',
  position   int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dashboards" ON dashboards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_user ON dashboards(user_id);
```

**DOWN**
```sql
DROP TABLE IF EXISTS dashboards;
```

---

<!-- Future entries (Phase 4/5) get appended here with UP/DOWN. -->
