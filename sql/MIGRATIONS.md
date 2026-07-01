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

<!-- Future entries (Phase 2 profiles, Phase 3 dashboards) get appended here with UP/DOWN. -->
