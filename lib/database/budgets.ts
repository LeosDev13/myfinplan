import { useQuery, usePowerSync } from "@powersync/react-native";
import {
  BudgetWithTotals,
  BudgetItemWithSpend,
  Transaction,
} from "../types";

export function useBudgets(workspaceId: string) {
  return useQuery<BudgetWithTotals>(
    `SELECT
       b.*,
       COALESCE(SUM(t.amount_cents), 0) AS spent_cents,
       COALESCE(SUM(bi.planned_cents), 0) AS total_planned_cents
     FROM budgets b
     LEFT JOIN budget_items bi ON bi.budget_id = b.id
     LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
     LEFT JOIN transactions t ON t.id = bit.transaction_id
     WHERE b.workspace_id = ?
     GROUP BY b.id
     ORDER BY b.event_date ASC NULLS LAST, b.created_at DESC`,
    [workspaceId]
  );
}

export function useBudgetWithTotals(budgetId: string) {
  const result = useQuery<BudgetWithTotals>(
    `SELECT
       b.*,
       COALESCE(SUM(t.amount_cents), 0) AS spent_cents,
       COALESCE(SUM(bi.planned_cents), 0) AS total_planned_cents
     FROM budgets b
     LEFT JOIN budget_items bi ON bi.budget_id = b.id
     LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
     LEFT JOIN transactions t ON t.id = bit.transaction_id
     WHERE b.id = ?
     GROUP BY b.id`,
    [budgetId]
  );
  return {
    data: result.data[0] ?? null,
    isLoading: result.isLoading,
    error: result.error,
  };
}

export function useBudgetItemsWithSpend(budgetId: string) {
  return useQuery<BudgetItemWithSpend>(
    `SELECT
       bi.*,
       b.currency,
       COALESCE(SUM(t.amount_cents), 0) AS spent_cents
     FROM budget_items bi
     JOIN budgets b ON b.id = bi.budget_id
     LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
     LEFT JOIN transactions t ON t.id = bit.transaction_id
     WHERE bi.budget_id = ?
     GROUP BY bi.id
     ORDER BY bi.created_at ASC`,
    [budgetId]
  );
}

export function useBudgetItemWithSpend(itemId: string) {
  const result = useQuery<BudgetItemWithSpend>(
    `SELECT
       bi.*,
       b.currency,
       COALESCE(SUM(t.amount_cents), 0) AS spent_cents
     FROM budget_items bi
     JOIN budgets b ON b.id = bi.budget_id
     LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
     LEFT JOIN transactions t ON t.id = bit.transaction_id
     WHERE bi.id = ?
     GROUP BY bi.id`,
    [itemId]
  );
  return {
    data: result.data[0] ?? null,
    isLoading: result.isLoading,
    error: result.error,
  };
}

export function useLinkedTransactions(itemId: string) {
  return useQuery<Transaction>(
    `SELECT t.*
     FROM transactions t
     JOIN budget_item_transactions bit ON bit.transaction_id = t.id
     WHERE bit.budget_item_id = ?
     ORDER BY t.datetime DESC`,
    [itemId]
  );
}

export function useUnlinkedTransactions(workspaceId: string, itemId: string) {
  return useQuery<Transaction>(
    `SELECT * FROM transactions
     WHERE workspace_id = ?
       AND id NOT IN (
         SELECT transaction_id FROM budget_item_transactions WHERE budget_item_id = ?
       )
     ORDER BY datetime DESC`,
    [workspaceId, itemId]
  );
}

export function useBudgetMutations() {
  const db = usePowerSync();

  const create = async (
    workspaceId: string,
    data: {
      name: string;
      currency: string;
      event_date: string | null;
      notes: string | null;
    }
  ): Promise<string> => {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO budgets (id, workspace_id, name, currency, event_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        workspaceId,
        data.name,
        data.currency,
        data.event_date,
        data.notes,
        new Date().toISOString(),
      ]
    );
    return id;
  };

  return { create };
}

export function useBudgetItemMutations() {
  const db = usePowerSync();

  const create = async (
    budgetId: string,
    data: {
      name: string;
      planned_cents: number;
    }
  ): Promise<string> => {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO budget_items (id, budget_id, name, planned_cents, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, budgetId, data.name, data.planned_cents, new Date().toISOString()]
    );
    return id;
  };

  return { create };
}

export function useBudgetLinkMutations() {
  const db = usePowerSync();

  const link = async (itemId: string, transactionId: string): Promise<void> => {
    await db.execute(
      `INSERT OR IGNORE INTO budget_item_transactions (budget_item_id, transaction_id)
       VALUES (?, ?)`,
      [itemId, transactionId]
    );
  };

  const unlink = async (
    itemId: string,
    transactionId: string
  ): Promise<void> => {
    await db.execute(
      `DELETE FROM budget_item_transactions
       WHERE budget_item_id = ? AND transaction_id = ?`,
      [itemId, transactionId]
    );
  };

  return { link, unlink };
}
