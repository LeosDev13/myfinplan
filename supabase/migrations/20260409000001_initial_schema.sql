-- ============================================================
-- myfinplan-mobile — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Workspaces
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  join_code   text not null unique,
  created_at  timestamptz not null default now()
);

-- Workspace membership
create table workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- Accounts
create table accounts (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references workspaces(id) on delete cascade,
  name                  text not null,
  account_type          text not null check (account_type in ('personal', 'shared')),
  owner                 text not null,
  currency              text not null default 'EUR',
  initial_balance_cents bigint not null default 0,
  created_at            timestamptz not null default now()
);

-- Transactions
create table transactions (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspaces(id) on delete cascade,
  account_id       uuid not null references accounts(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('expense', 'income', 'transfer')),
  category         text not null,
  subcategory      text,
  sub_subcategory  text,
  amount_cents     bigint not null,
  currency         text not null default 'EUR',
  note             text,
  merchant         text,
  datetime         timestamptz not null,
  tags             text[] not null default '{}',
  reimbursed       boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Budgets
create table budgets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  currency     text not null default 'EUR',
  event_date   date,
  notes        text,
  created_at   timestamptz not null default now()
);

-- Budget items
create table budget_items (
  id            uuid primary key default gen_random_uuid(),
  budget_id     uuid not null references budgets(id) on delete cascade,
  name          text not null,
  planned_cents bigint not null,
  notes         text,
  created_at    timestamptz not null default now()
);

-- Budget item ↔ transaction links
create table budget_item_transactions (
  id             uuid primary key default gen_random_uuid(),
  budget_item_id uuid not null references budget_items(id) on delete cascade,
  transaction_id uuid not null unique references transactions(id),
  created_at     timestamptz not null default now()
);

-- Categories
create table categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  is_built_in  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Subcategories
create table subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name        text not null,
  is_built_in boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Indexes for common query patterns
create index transactions_workspace_datetime on transactions(workspace_id, datetime desc);
create index transactions_account_id on transactions(account_id);
create index budget_items_budget_id on budget_items(budget_id);
create index subcategories_category_id on subcategories(category_id);
create index workspace_members_user_id on workspace_members(user_id);
