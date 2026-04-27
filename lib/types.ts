export type AccountType = "personal" | "shared";
export type TransactionType = "expense" | "income" | "transfer";

export interface Account {
  id: string;
  workspace_id: string;
  name: string;
  account_type: AccountType;
  owner: string;
  currency: string;
  initial_balance_cents: number;
  created_at: string;
}

export interface AccountWithBalance extends Account {
  balance_cents: number;
}

export interface Transaction {
  id: string;
  workspace_id: string;
  account_id: string;
  transaction_type: TransactionType;
  category: string;
  subcategory: string | null;
  sub_subcategory: string | null;
  amount_cents: number;
  currency: string;
  note: string | null;
  merchant: string | null;
  datetime: string;
  tags: string; // JSON array as text
  reimbursed: number; // 0 | 1
  created_at: string;
}

export interface Budget {
  id: string;
  workspace_id: string;
  name: string;
  currency: string;
  event_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  name: string;
  planned_cents: number;
  notes: string | null;
  created_at: string;
}

export interface BudgetItemTransaction {
  id: string;
  budget_item_id: string;
  transaction_id: string;
  created_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  is_built_in: number; // 0 | 1
  created_at: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  is_built_in: number; // 0 | 1
  created_at: string;
}
