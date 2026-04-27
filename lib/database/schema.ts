import { column, Schema, Table } from "@powersync/react-native";

const accounts = new Table({
  workspace_id: column.text,
  name: column.text,
  account_type: column.text,
  owner: column.text,
  currency: column.text,
  initial_balance_cents: column.integer,
  created_at: column.text,
});

const transactions = new Table({
  workspace_id: column.text,
  account_id: column.text,
  transaction_type: column.text,
  category: column.text,
  subcategory: column.text,
  sub_subcategory: column.text,
  amount_cents: column.integer,
  currency: column.text,
  note: column.text,
  merchant: column.text,
  datetime: column.text,
  tags: column.text,      // JSON array stored as text: '["tag1","tag2"]'
  reimbursed: column.integer, // 0 | 1
  created_at: column.text,
});

const budgets = new Table({
  workspace_id: column.text,
  name: column.text,
  currency: column.text,
  event_date: column.text,
  notes: column.text,
  created_at: column.text,
});

const budget_items = new Table({
  budget_id: column.text,
  name: column.text,
  planned_cents: column.integer,
  notes: column.text,
  created_at: column.text,
});

const budget_item_transactions = new Table({
  budget_item_id: column.text,
  transaction_id: column.text,
  created_at: column.text,
});

const categories = new Table({
  workspace_id: column.text,
  name: column.text,
  is_built_in: column.integer, // 0 | 1
  created_at: column.text,
});

const subcategories = new Table({
  category_id: column.text,
  name: column.text,
  is_built_in: column.integer, // 0 | 1
  created_at: column.text,
});

export const AppSchema = new Schema({
  accounts,
  transactions,
  budgets,
  budget_items,
  budget_item_transactions,
  categories,
  subcategories,
});

export type Database = (typeof AppSchema)["types"];
