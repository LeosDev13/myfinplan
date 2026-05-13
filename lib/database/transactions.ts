import { useQuery, usePowerSync } from "@powersync/react-native";
import { generateId } from "~/lib/uuid";
import { Transaction } from "../types";

export function useTransactions(limit?: number) {
  return useQuery<Transaction>(
    limit != null
      ? `SELECT * FROM transactions ORDER BY datetime DESC LIMIT ?`
      : `SELECT * FROM transactions ORDER BY datetime DESC`,
    limit != null ? [limit] : []
  );
}

export function useTransaction(id: string) {
  const result = useQuery<Transaction>(
    `SELECT * FROM transactions WHERE id = ? LIMIT 1`,
    [id]
  );
  return { data: result.data[0] ?? null, isLoading: result.isLoading };
}

export function useTransactionMutations() {
  const db = usePowerSync();

  const create = async (
    workspaceId: string,
    data: {
      account_id: string;
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
         (id, workspace_id, account_id, transaction_type, category, subcategory,
          sub_subcategory, amount_cents, currency, note, merchant, datetime,
          tags, reimbursed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        workspaceId,
        data.account_id,
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
         account_id = ?, transaction_type = ?, category = ?, subcategory = ?,
         amount_cents = ?, currency = ?, note = ?, merchant = ?,
         datetime = ?, tags = ?, reimbursed = ?
       WHERE id = ?`,
      [
        data.account_id, data.transaction_type, data.category, data.subcategory,
        data.amount_cents, data.currency, data.note, data.merchant,
        data.datetime, data.tags, data.reimbursed, id,
      ]
    );
  };

  const remove = async (id: string) => {
    await db.execute(`DELETE FROM transactions WHERE id = ?`, [id]);
  };

  return { create, update, remove };
}
