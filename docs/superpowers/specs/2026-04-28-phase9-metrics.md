# Phase 9 — Metrics Screen Design

**Date:** 2026-04-28
**Status:** Approved

---

## Goal

Build the Metrics screen: a single scrollable analytics view showing spending summary, category breakdown with inline subcategory drill-down, and a monthly cash flow chart — all filtered by a tappable period picker.

---

## Screen Structure

One screen — `app/(app)/metrics/index.tsx`. No sub-navigation. All interaction happens inline.

---

## Period Picker

Four pills displayed horizontally below the header:

| Label | From date | To date |
|---|---|---|
| This month | Start of current calendar month | Now |
| Last month | Start of previous calendar month | End of previous calendar month |
| 6 months | 6 months ago (same day) | Now |
| Year | 12 months ago (same day) | Now |

Default: **This month**.

The selected period is stored in component state. Changing it re-queries all three sections reactively via PowerSync.

---

## Section 1 — Summary Row

Three equal-width cards in a horizontal row:

| Card | Value | Colour |
|---|---|---|
| Income | SUM of `income` transactions in period | `#10b981` |
| Spent | SUM of `expense` transactions in period | `#ef4444` |
| Saved | Income − Spent | `#10b981` if ≥ 0, `#ef4444` if negative |

Each card: `bg-card rounded-2xl p-3`, label in `text-[10px] uppercase tracking-widest text-muted-foreground`, value in `text-[18px] font-extrabold`.

---

## Section 2 — Top Categories

Header: `"TOP CATEGORIES"` — `text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`.

List of expense categories sorted by total descending. Each row:

- Category name — `font-semibold text-sm text-foreground`
- Amount + percentage — `text-sm font-bold text-foreground` right-aligned
- Horizontal bar below: track `#1f1f1f`, fill `#10b981`, height 4px, width = `(category_total / max_category_total) * 100%`
- Chevron right (`›`) when collapsed, down (`‹` rotated) when expanded — `#525252`

**Inline expand:** Tapping a category expands it in-place to show subcategory rows. Subcategories show name and amount (`text-[12px] text-muted-foreground`). Tapping again collapses. Only one category can be expanded at a time.

Empty state (no expenses in period): "No spending data for this period" centred in muted text.

---

## Section 3 — Monthly Cash Flow

Header: `"MONTHLY CASH FLOW"` — same style as section 2 header.

Grouped bar chart rendered with plain `View` components (no charting library):

- One pair of bars per month
- Left bar: income — `#10b981`
- Right bar: expenses — `#ef4444`
- Bar heights proportional to the maximum value across all months in the visible range
- Month label below each pair (`text-[9px] text-muted-foreground`), format `MMM` (e.g. `Apr`)
- Legend below chart: green square + "Income", red square + "Expenses"

**Months displayed** by period:

| Period | Months shown |
|---|---|
| This month | Last 6 calendar months (for context) |
| Last month | Last 6 calendar months |
| 6 months | Last 6 calendar months |
| Year | Last 12 calendar months |

Bar container: `bg-card rounded-2xl p-4`. Max bar height: 80px. Bar width fills available space with `gap: 6` between pairs.

---

## Data Layer (`lib/database/metrics.ts`)

All hooks take `workspaceId`, `from` (ISO datetime string), and `to` (ISO datetime string) — computed once in the screen component from the selected period.

### `useMetricsSummary(workspaceId, from, to)`

```sql
SELECT
  COALESCE(SUM(CASE WHEN transaction_type = 'income'  THEN amount_cents ELSE 0 END), 0) AS income_cents,
  COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents
FROM transactions
WHERE workspace_id = ?
  AND datetime >= ?
  AND datetime <= ?
```

Returns `{ income_cents: number, expense_cents: number }`. `saved_cents` computed in JS: `income_cents - expense_cents`.

### `useCategoryBreakdown(workspaceId, from, to)`

Two queries:

**Category totals:**
```sql
SELECT
  category,
  COALESCE(SUM(amount_cents), 0) AS total_cents
FROM transactions
WHERE workspace_id = ?
  AND transaction_type = 'expense'
  AND datetime >= ?
  AND datetime <= ?
GROUP BY category
ORDER BY total_cents DESC
```

**Subcategory totals:**
```sql
SELECT
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
ORDER BY category, total_cents DESC
```

Merged in JS: each category row gets a `subcategories` array from the second query.

### `useMonthlyTrend(workspaceId, from, to)`

`from` and `to` are ISO datetime strings covering the full trend window (e.g. 6 or 12 months back to now). Single query using `strftime` to group by month:

```sql
SELECT
  strftime('%Y-%m', datetime) AS month,
  COALESCE(SUM(CASE WHEN transaction_type = 'income'  THEN amount_cents ELSE 0 END), 0) AS income_cents,
  COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents
FROM transactions
WHERE workspace_id = ?
  AND datetime >= ?
  AND datetime <= ?
GROUP BY month
ORDER BY month ASC
```

Returns `{ month: "YYYY-MM", income_cents, expense_cents }[]`. The screen generates the full list of expected month labels in JS and merges with query results, filling in `{ income_cents: 0, expense_cents: 0 }` for months with no transactions so the chart always shows a complete range.

---

## Types (add to `lib/types.ts`)

```ts
export interface MetricsSummary {
  income_cents: number;
  expense_cents: number;
  saved_cents: number;
}

export interface CategoryBreakdownRow {
  category: string;
  total_cents: number;
  subcategories: { name: string; total_cents: number }[];
}

export interface MonthlyTrendRow {
  month: string;       // "YYYY-MM"
  income_cents: number;
  expense_cents: number;
}
```

---

## Files

| File | Action |
|---|---|
| `app/(app)/metrics/index.tsx` | Replace placeholder — full Metrics screen |
| `lib/database/metrics.ts` | Create — summary, category breakdown, monthly trend hooks |
| `lib/types.ts` | Add `MetricsSummary`, `CategoryBreakdownRow`, `MonthlyTrendRow` |

---

## Out of Scope

- Tapping a category navigating to a transaction list (inline expand only)
- Savings goals or budget comparison
- Export or sharing
- Account-level breakdown
- Tags analytics
