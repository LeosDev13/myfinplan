import { useQuery } from "@powersync/react-native";
import type { MonthlyTrendRow } from "../types";

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Generates an array of "YYYY-MM" strings for the last `months` calendar months,
 * oldest first. Used to fill zeros for months with no transactions in the chart.
 *
 * Example: generateMonthRange(3) in April 2026 → ["2026-02", "2026-03", "2026-04"]
 */
export function generateMonthRange(months: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return result;
}

// ─── queries ─────────────────────────────────────────────────────────────────

/**
 * Returns total income and expense cents for the given date window.
 * `saved_cents` is computed by the caller (income − expense).
 */
export function useMetricsSummary(
  workspaceId: string,
  from: string,
  to: string
) {
  const result = useQuery<{ income_cents: number; expense_cents: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type = 'income'  THEN amount_cents ELSE 0 END), 0) AS income_cents,
       COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents
     FROM transactions
     WHERE workspace_id = ?
       AND datetime >= ?
       AND datetime <= ?`,
    [workspaceId, from, to]
  );
  return { data: result.data[0] ?? null, isLoading: result.isLoading };
}

/**
 * Returns expense totals grouped by category (desc), each with its subcategory breakdown.
 * Runs two queries and merges them in JS.
 */
export function useCategoryBreakdown(
  workspaceId: string,
  from: string,
  to: string
) {
  const cats = useQuery<{ category: string; total_cents: number }>(
    `SELECT
       category,
       COALESCE(SUM(amount_cents), 0) AS total_cents
     FROM transactions
     WHERE workspace_id = ?
       AND transaction_type = 'expense'
       AND datetime >= ?
       AND datetime <= ?
     GROUP BY category
     ORDER BY total_cents DESC`,
    [workspaceId, from, to]
  );

  const subs = useQuery<{
    category: string;
    subcategory: string;
    total_cents: number;
  }>(
    `SELECT
       category,
       subcategory,
       COALESCE(SUM(amount_cents), 0) AS total_cents
     FROM transactions
     WHERE workspace_id = ?
       AND transaction_type = 'expense'
       AND datetime >= ?
       AND datetime <= ?
       AND subcategory IS NOT NULL
       AND subcategory != ''
     GROUP BY category, subcategory
     ORDER BY category, total_cents DESC`,
    [workspaceId, from, to]
  );

  const data = cats.data.map((cat) => ({
    category: cat.category,
    total_cents: cat.total_cents,
    subcategories: subs.data
      .filter((s) => s.category === cat.category)
      .map((s) => ({ name: s.subcategory, total_cents: s.total_cents })),
  }));

  return { data, isLoading: cats.isLoading || subs.isLoading };
}

/**
 * Top merchants by total expense amount for the given period (max 5).
 * Excludes transactions with null or empty merchant.
 */
export function useTopMerchants(workspaceId: string, from: string, to: string) {
  return useQuery<{ merchant: string; total_cents: number; count: number }>(
    `SELECT
       merchant,
       COALESCE(SUM(amount_cents), 0) AS total_cents,
       COUNT(*) AS count
     FROM transactions
     WHERE workspace_id = ?
       AND transaction_type = 'expense'
       AND datetime >= ?
       AND datetime <= ?
       AND merchant IS NOT NULL
       AND merchant != ''
     GROUP BY merchant
     ORDER BY total_cents DESC
     LIMIT 5`,
    [workspaceId, from, to]
  );
}

/**
 * The single largest expense transaction in the period.
 */
export function useLargestExpense(workspaceId: string, from: string, to: string) {
  const result = useQuery<{ merchant: string | null; category: string; amount_cents: number; datetime: string }>(
    `SELECT merchant, category, amount_cents, datetime
     FROM transactions
     WHERE workspace_id = ?
       AND transaction_type = 'expense'
       AND datetime >= ?
       AND datetime <= ?
     ORDER BY amount_cents DESC
     LIMIT 1`,
    [workspaceId, from, to]
  );
  return { data: result.data[0] ?? null, isLoading: result.isLoading };
}

/**
 * Returns income and expense totals grouped by calendar month ("YYYY-MM")
 * for the given date window, ordered oldest→newest.
 *
 * Months with no transactions are NOT included — the screen fills zeros using
 * generateMonthRange() merged with this result.
 */
export function useMonthlyTrend(
  workspaceId: string,
  from: string,
  to: string
) {
  return useQuery<MonthlyTrendRow>(
    `SELECT
       strftime('%Y-%m', datetime) AS month,
       COALESCE(SUM(CASE WHEN transaction_type = 'income'  THEN amount_cents ELSE 0 END), 0) AS income_cents,
       COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents
     FROM transactions
     WHERE workspace_id = ?
       AND datetime >= ?
       AND datetime <= ?
     GROUP BY month
     ORDER BY month ASC`,
    [workspaceId, from, to]
  );
}
