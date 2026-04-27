import { useQuery, usePowerSync } from "@powersync/react-native";
import { AccountWithBalance } from "../types";

export function useAccounts() {
  return useQuery<AccountWithBalance>(`
    SELECT
      a.*,
      a.initial_balance_cents
        + COALESCE(SUM(CASE WHEN t.transaction_type = 'income'  THEN t.amount_cents ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount_cents ELSE 0 END), 0)
      AS balance_cents
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at ASC
  `);
}

export function useAccountMutations() {
  const db = usePowerSync();

  const create = async (
    workspaceId: string,
    data: {
      name: string;
      account_type: string;
      owner: string;
      currency: string;
      initial_balance_cents: number;
    }
  ) => {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO accounts (id, workspace_id, name, account_type, owner, currency, initial_balance_cents, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, workspaceId, data.name, data.account_type, data.owner, data.currency, data.initial_balance_cents, new Date().toISOString()]
    );
    return id;
  };

  const update = async (
    id: string,
    data: { name: string; initial_balance_cents: number }
  ) => {
    await db.execute(
      "UPDATE accounts SET name = ?, initial_balance_cents = ? WHERE id = ?",
      [data.name, data.initial_balance_cents, id]
    );
  };

  const remove = async (id: string) => {
    await db.execute("DELETE FROM accounts WHERE id = ?", [id]);
  };

  return { create, update, remove };
}
