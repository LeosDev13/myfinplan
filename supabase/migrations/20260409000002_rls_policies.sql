-- ============================================================
-- myfinplan-mobile — Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table budget_items enable row level security;
alter table budget_item_transactions enable row level security;
alter table categories enable row level security;
alter table subcategories enable row level security;

-- Helper function: returns the workspace_id for the calling user
-- SECURITY DEFINER so it can bypass RLS on workspace_members
create or replace function get_user_workspace_id()
returns uuid
language sql
stable
security definer
as $$
  select workspace_id
  from workspace_members
  where user_id = auth.uid()
  limit 1;
$$;

-- workspaces: users can only see their own workspace
create policy "workspace_select" on workspaces
  for select using (id = get_user_workspace_id());

-- workspace_members: users can only see their own membership row
create policy "workspace_members_select" on workspace_members
  for select using (user_id = auth.uid());

-- accounts
create policy "accounts_select" on accounts
  for select using (workspace_id = get_user_workspace_id());
create policy "accounts_insert" on accounts
  for insert with check (workspace_id = get_user_workspace_id());
create policy "accounts_update" on accounts
  for update using (workspace_id = get_user_workspace_id());
create policy "accounts_delete" on accounts
  for delete using (workspace_id = get_user_workspace_id());

-- transactions
create policy "transactions_select" on transactions
  for select using (workspace_id = get_user_workspace_id());
create policy "transactions_insert" on transactions
  for insert with check (workspace_id = get_user_workspace_id());
create policy "transactions_update" on transactions
  for update using (workspace_id = get_user_workspace_id());
create policy "transactions_delete" on transactions
  for delete using (workspace_id = get_user_workspace_id());

-- budgets
create policy "budgets_select" on budgets
  for select using (workspace_id = get_user_workspace_id());
create policy "budgets_insert" on budgets
  for insert with check (workspace_id = get_user_workspace_id());
create policy "budgets_update" on budgets
  for update using (workspace_id = get_user_workspace_id());
create policy "budgets_delete" on budgets
  for delete using (workspace_id = get_user_workspace_id());

-- budget_items (scoped via parent budget)
create policy "budget_items_select" on budget_items
  for select using (
    budget_id in (select id from budgets where workspace_id = get_user_workspace_id())
  );
create policy "budget_items_insert" on budget_items
  for insert with check (
    budget_id in (select id from budgets where workspace_id = get_user_workspace_id())
  );
create policy "budget_items_update" on budget_items
  for update using (
    budget_id in (select id from budgets where workspace_id = get_user_workspace_id())
  );
create policy "budget_items_delete" on budget_items
  for delete using (
    budget_id in (select id from budgets where workspace_id = get_user_workspace_id())
  );

-- budget_item_transactions (scoped via parent item → budget)
create policy "budget_item_transactions_select" on budget_item_transactions
  for select using (
    budget_item_id in (
      select bi.id from budget_items bi
      join budgets b on b.id = bi.budget_id
      where b.workspace_id = get_user_workspace_id()
    )
  );
create policy "budget_item_transactions_insert" on budget_item_transactions
  for insert with check (
    budget_item_id in (
      select bi.id from budget_items bi
      join budgets b on b.id = bi.budget_id
      where b.workspace_id = get_user_workspace_id()
    )
  );
create policy "budget_item_transactions_delete" on budget_item_transactions
  for delete using (
    budget_item_id in (
      select bi.id from budget_items bi
      join budgets b on b.id = bi.budget_id
      where b.workspace_id = get_user_workspace_id()
    )
  );

-- categories
create policy "categories_select" on categories
  for select using (workspace_id = get_user_workspace_id());
create policy "categories_insert" on categories
  for insert with check (workspace_id = get_user_workspace_id());
create policy "categories_update" on categories
  for update using (workspace_id = get_user_workspace_id());
create policy "categories_delete" on categories
  for delete using (workspace_id = get_user_workspace_id());

-- subcategories (scoped via parent category)
create policy "subcategories_select" on subcategories
  for select using (
    category_id in (select id from categories where workspace_id = get_user_workspace_id())
  );
create policy "subcategories_insert" on subcategories
  for insert with check (
    category_id in (select id from categories where workspace_id = get_user_workspace_id())
  );
create policy "subcategories_update" on subcategories
  for update using (
    category_id in (select id from categories where workspace_id = get_user_workspace_id())
  );
create policy "subcategories_delete" on subcategories
  for delete using (
    category_id in (select id from categories where workspace_id = get_user_workspace_id())
  );
