import { useQuery, usePowerSync } from "@powersync/react-native";
import { generateId } from "~/lib/uuid";
import { Transaction } from "../types";

export function useTransactions(limit?: number, accountId?: string | null) {
  const hasAccount = !!accountId;
  const hasLimit = limit != null;

  const sql = hasAccount
    ? hasLimit
      ? `SELECT * FROM transactions WHERE (account_id = ? OR to_account_id = ?) ORDER BY datetime DESC LIMIT ?`
      : `SELECT * FROM transactions WHERE (account_id = ? OR to_account_id = ?) ORDER BY datetime DESC`
    : hasLimit
      ? `SELECT * FROM transactions ORDER BY datetime DESC LIMIT ?`
      : `SELECT * FROM transactions ORDER BY datetime DESC`;

  const params = hasAccount
    ? hasLimit ? [accountId, accountId, limit] : [accountId, accountId]
    : hasLimit ? [limit] : [];

  return useQuery<Transaction>(sql, params);
}

export function useTransaction(id: string) {
  const result = useQuery<Transaction>(
    `SELECT * FROM transactions WHERE id = ? LIMIT 1`,
    [id]
  );
  return { data: result.data[0] ?? null, isLoading: result.isLoading };
}

export function useMerchants() {
  const result = useQuery<{ merchant: string }>(
    `SELECT DISTINCT merchant FROM transactions
     WHERE merchant IS NOT NULL AND merchant != ''
     ORDER BY merchant ASC`
  );
  return result.data.map((r) => r.merchant);
}

export function useTransactionMutations() {
  const db = usePowerSync();

  const create = async (
    workspaceId: string,
    data: {
      account_id: string;
      to_account_id: string | null;
      transaction_type: string;
      category: string;
      subcategory: string | null;
      amount_cents: number;
      currency: string;
      note: string | null;
      merchant: string | null;
      datetime: string;
      tags: string;
      reimbursed: number;
    }
  ): Promise<string> => {
    const id = generateId();
    await db.execute(
      `INSERT INTO transactions
         (id, workspace_id, account_id, to_account_id, transaction_type, category, subcategory,
          sub_subcategory, amount_cents, currency, note, merchant, datetime,
          tags, reimbursed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        workspaceId,
        data.account_id,
        data.to_account_id,
        data.transaction_type,
        data.category,
        data.subcategory,
        null,
        data.amount_cents,
        data.currency,
        data.note,
        data.merchant,
        data.datetime,
        data.tags,
        data.reimbursed,
        new Date().toISOString(),
      ]
    );
    return id;
  };

  const update = async (
    id: string,
    data: {
      account_id: string;
      to_account_id: string | null;
      transaction_type: string;
      category: string;
      subcategory: string | null;
      amount_cents: number;
      currency: string;
      note: string | null;
      merchant: string | null;
      datetime: string;
      tags: string;
      reimbursed: number;
    }
  ) => {
    await db.execute(
      `UPDATE transactions SET
         account_id = ?, to_account_id = ?, transaction_type = ?, category = ?, subcategory = ?,
         amount_cents = ?, currency = ?, note = ?, merchant = ?,
         datetime = ?, tags = ?, reimbursed = ?
       WHERE id = ?`,
      [
        data.account_id, data.to_account_id, data.transaction_type, data.category, data.subcategory,
        data.amount_cents, data.currency, data.note, data.merchant,
        data.datetime, data.tags, data.reimbursed, id,
      ]
    );
  };

  const remove = async (id: string) => {
    // Remove any budget item links first to avoid FK constraint violations on the server
    await db.execute(`DELETE FROM budget_item_transactions WHERE transaction_id = ?`, [id]);
    await db.execute(`DELETE FROM transactions WHERE id = ?`, [id]);
  };

  return { create, update, remove };
}
