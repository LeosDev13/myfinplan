# Phase 8 — Budgets Screen Design

**Date:** 2026-04-27
**Status:** Approved

---

## Goal

Build the Budgets feature: a list of event/project budgets, a detail screen per budget showing line items and overall progress, and a budget item detail screen showing linked transactions with the ability to link more from the transaction history.

---

## Screen Structure

Three screens under a Stack navigator nested inside the Budgets tab.

### Navigation

`app/(app)/budgets/_layout.tsx` — Stack navigator with `headerShown: false`, identical pattern to `app/(app)/more/_layout.tsx`.

---

### Screen 1: Budget List (`budgets/index.tsx`)

**Header**
- Title: "Budgets" — `text-2xl font-extrabold text-foreground`, left-aligned, safe-area aware
- `+` button: bare `Ionicons add` icon at 26px in `#10b981` (same pattern as Activity screen)

**Budget cards**
- `FlatList` of budget cards, `gap-3`, `px-3`
- Each card: `bg-card rounded-2xl p-4`, `flexDirection: row`, `alignItems: center`, `gap: 14`
- Left: 52×52 circular progress ring (SVG)
  - Track: `#1f1f1f`, stroke-width 4
  - Fill colour by spend %:
    - < 75%: `#10b981` (emerald)
    - 75–99%: `#f59e0b` (amber)
    - ≥ 100%: `#ef4444` (red)
  - Centre label: spend % in fill colour, `font-size: 11px font-weight: 700`
- Right: budget name (`font-semibold text-foreground text-[15px]`), event date + spent/total on the line below (`text-[11px] text-muted-foreground`)
  - Spent = SUM of all linked transaction `amount_cents` across all items in this budget ÷ 100
  - Format: `€1,200 / €2,000` — divide cents by 100, `toLocaleString`
  - Event date: `MMM YYYY` (e.g. `Jun 2026`), omit if null

**Empty state**
- Centred: "No budgets yet" (`text-muted-foreground font-semibold`) + "Tap + to create one" below in smaller muted text

**Add Budget sheet**
Opens from `+`. Fields:

| Field | Component | Required | Notes |
|---|---|---|---|
| Name | `Input` | Yes | Free text |
| Event date | Tappable row → `DateTimePickerModal` (date mode) | No | Displays as `DD MMM YYYY`, stored as ISO date string |
| Currency | `Select` | Yes | Options: EUR, USD, GBP. Defaults to `EUR` |
| Notes | `Input` | No | Free text |

Save button: disabled until Name filled. On save: `budgetMutations.create(...)`, close sheet.

---

### Screen 2: Budget Detail (`budgets/[id].tsx`)

**Header**
- Back chevron (`Ionicons chevron-back` at 24px, `#10b981`) + budget name (`font-extrabold text-2xl`)
- `+ Item` text button top-right (`text-sm font-semibold text-primary`)

**Summary section**
- Centred 100×100 SVG ring (same colour logic as list cards)
- Below ring: three stats in a row — Spent · Remaining · Planned
  - Spent in fill colour (green/amber/red), Remaining and Planned in `text-muted-foreground`
- Budget name as subtitle, event date below it in `text-muted-foreground`

**Item list**
- `FlatList` of budget item rows
- Same grouped border-radius pattern as transaction rows (top group: `rounded-t-xl rounded-b-sm`, middle: `rounded-sm`, bottom: `rounded-b-xl rounded-t-sm`)
- Each row: `bg-card px-4 py-3`
  - Left: item name (`font-semibold text-sm text-foreground`)
  - Right: `€spent / €planned` in fill colour (`text-sm font-bold`)
  - Below: thin 3px progress bar, same colour logic
- Tapping a row navigates to `budgets/item/[id]`

**Empty state for items**
- "No items yet · Tap + Item to add one" centred in the list area

**Add Item sheet**
Opens from `+ Item`. Fields:

| Field | Component | Required | Notes |
|---|---|---|---|
| Name | `Input` | Yes | Free text |
| Planned amount | `Input` numeric | Yes | Currency prefix (`€`), stored as cents |

Save button: disabled until both filled. On save: `budgetItemMutations.create(budgetId, ...)`, close sheet.

---

### Screen 3: Budget Item Detail (`budgets/item/[id].tsx`)

**Header**
- Back chevron + item name (`font-extrabold text-2xl`)
- `Link txn` text button top-right (`text-sm font-semibold text-primary`)

**Summary card**
- `bg-card rounded-2xl p-4`, `flexDirection: row`, `justifyContent: space-between`
- Left column: item name, spent amount in fill colour, "of €planned" below in muted
- Right: 44×44 ring with % in centre

**Linked transactions**
- Section header: "LINKED TRANSACTIONS" — same `text-[10px] font-semibold uppercase tracking-widest text-muted-foreground` as Activity
- Reuses `TransactionRow` component extracted from `app/(app)/transactions/index.tsx`
- Empty state: "No transactions linked yet" in muted text

**Transaction picker sheet**
Opens from `Link txn`. Content:
- Title: "Link transactions"
- `FlatList` of all transactions not yet linked to this item, ordered by `datetime DESC`
- Each row: same `TransactionRow` style but with a checkmark circle on the right (`Ionicons checkmark-circle` / `checkmark-circle-outline`)
- Multi-select — tap to toggle
- Footer: full-width `Button` "Link N transactions" (disabled when 0 selected). On press: calls `budgetLinkMutations.link(itemId, txId)` for each selected id, closes sheet.

---

## Data Layer (`lib/database/budgets.ts`)

```ts
// useBudgets(workspaceId) → { data: BudgetWithTotals[], isLoading, error }
// useBudgetWithTotals(budgetId) → { data: BudgetWithTotals, items: BudgetItemWithSpend[] }
// useBudgetItemWithSpend(itemId) → { item: BudgetItemWithSpend, transactions: Transaction[] }
// useUnlinkedTransactions(itemId) → { data: Transaction[] }
// useBudgetMutations() → { create }
// useBudgetItemMutations() → { create }
// useBudgetLinkMutations() → { link, unlink }
```

### Types (add to `lib/types.ts`)

```ts
export interface BudgetWithTotals extends Budget {
  spent_cents: number;   // SUM of linked transaction amounts across all items
  total_planned_cents: number; // SUM of item planned_cents
}

export interface BudgetItemWithSpend extends BudgetItem {
  spent_cents: number;   // SUM of linked transaction amounts for this item
}
```

### `useBudgets(workspaceId)`
PowerSync `useQuery`:
```sql
SELECT
  b.*,
  COALESCE(SUM(t.amount_cents), 0) AS spent_cents,
  COALESCE(SUM(bi.planned_cents), 0) AS total_planned_cents
FROM budgets b
LEFT JOIN budget_items bi ON bi.budget_id = b.id
LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
LEFT JOIN transactions t ON t.id = bit.transaction_id
WHERE b.workspace_id = ?
GROUP BY b.id
ORDER BY b.event_date ASC NULLS LAST, b.created_at DESC
```

### `useBudgetWithTotals(budgetId)` + `useBudgetItemsWithSpend(budgetId)`
Two separate queries:
1. Single budget row (same aggregation as above, WHERE `b.id = ?`)
2. Items with spend:
```sql
SELECT
  bi.*,
  COALESCE(SUM(t.amount_cents), 0) AS spent_cents
FROM budget_items bi
LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
LEFT JOIN transactions t ON t.id = bit.transaction_id
WHERE bi.budget_id = ?
GROUP BY bi.id
ORDER BY bi.created_at ASC
```

### `useBudgetItemWithSpend(itemId)` + `useLinkedTransactions(itemId)`
1. Single item with spend (same aggregation, WHERE `bi.id = ?`)
2. Linked transactions:
```sql
SELECT t.*
FROM transactions t
JOIN budget_item_transactions bit ON bit.transaction_id = t.id
WHERE bit.budget_item_id = ?
ORDER BY t.datetime DESC
```

### `useUnlinkedTransactions(itemId)`
```sql
SELECT * FROM transactions
WHERE id NOT IN (
  SELECT transaction_id FROM budget_item_transactions WHERE budget_item_id = ?
)
ORDER BY datetime DESC
```

### Mutations

**`useBudgetMutations().create`**
```ts
create(workspaceId: string, data: {
  name: string;
  currency: string;
  event_date: string | null;  // ISO date string "YYYY-MM-DD"
  notes: string | null;
}) => Promise<string>
```
INSERT into `budgets` with `crypto.randomUUID()` id.

**`useBudgetItemMutations().create`**
```ts
create(budgetId: string, data: {
  name: string;
  planned_cents: number;
}) => Promise<string>
```
INSERT into `budget_items` with `crypto.randomUUID()` id.

**`useBudgetLinkMutations().link / .unlink`**
```ts
link(itemId: string, transactionId: string) => Promise<void>
unlink(itemId: string, transactionId: string) => Promise<void>
```
INSERT / DELETE on `budget_item_transactions`.

---

## Files

| File | Action |
|---|---|
| `app/(app)/budgets/_layout.tsx` | Create — Stack navigator |
| `app/(app)/budgets/index.tsx` | Replace placeholder — budget list + add sheet |
| `app/(app)/budgets/[id].tsx` | Create — budget detail + items + add item sheet |
| `app/(app)/budgets/item/[id].tsx` | Create — item detail + linked transactions + picker sheet |
| `lib/database/budgets.ts` | Create — all query + mutation hooks |
| `lib/types.ts` | Modify — add `BudgetWithTotals`, `BudgetItemWithSpend` |
| `app/(app)/transactions/TransactionRow.tsx` | Extract — move `TransactionRow` component out of `transactions/index.tsx` so it can be reused on the item detail screen |

---

## Out of Scope

- Edit / delete budget or budget item
- Unlink a transaction from an item (swipe-to-delete deferred to later phase)
- Budget sharing / permissions beyond workspace-level access
- Charts or analytics across budgets
