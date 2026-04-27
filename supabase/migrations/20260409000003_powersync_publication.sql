-- PowerSync requires a Postgres publication to track row-level changes
-- Must include all tables that PowerSync syncs

create publication powersync for table
  accounts,
  transactions,
  budgets,
  budget_items,
  budget_item_transactions,
  categories,
  subcategories;
