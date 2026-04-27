import { useQuery, usePowerSync } from "@powersync/react-native";
import { Transaction } from "../types";

export function useTransactions() {
  return useQuery<Transaction>(
    `SELECT * FROM transactions ORDER BY datetime DESC`
  );
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
    const id = crypto.randomUUID();
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

  return { create };
}
