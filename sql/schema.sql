-- MyFinance — Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Categories (income/expense types)
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('income', 'expense')),
  icon        text NOT NULL DEFAULT 'ph-tag',
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Accounts (bank accounts, cash, savings, etc.)
CREATE TABLE accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  type            text NOT NULL CHECK (type IN ('checking', 'savings', 'cash', 'investment')),
  currency        text NOT NULL DEFAULT 'EUR',
  initial_balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Transactions (income and expense entries)
CREATE TABLE transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type        text NOT NULL CHECK (type IN ('income', 'expense')),
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL DEFAULT '',
  date        date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Stocks (holdings)
CREATE TABLE stocks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker          text NOT NULL,
  name            text NOT NULL DEFAULT '',
  quantity        numeric(12,4) NOT NULL CHECK (quantity > 0),
  purchase_price  numeric(12,4) NOT NULL CHECK (purchase_price >= 0),
  purchase_date   date NOT NULL DEFAULT CURRENT_DATE,
  currency        text NOT NULL DEFAULT 'USD',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Stock price cache (avoid hammering the API)
CREATE TABLE stock_prices (
  ticker      text PRIMARY KEY,
  price       numeric(12,4) NOT NULL,
  change_pct  numeric(6,2) NOT NULL DEFAULT 0,
  fetched_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_stocks_user ON stocks(user_id);
