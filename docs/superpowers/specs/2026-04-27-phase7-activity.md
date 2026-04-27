# Phase 7 — Activity Screen Design

**Date:** 2026-04-27
**Status:** Approved

---

## Goal

Build the Activity screen: a date-grouped transaction list and a bottom sheet form to add new transactions.

---

## Screen: Activity

### Header
- Title: "Activity" — `text-2xl font-extrabold text-foreground`, left-aligned, safe-area aware
- `+` button: top-right, 28×28, `bg-primary rounded-lg`, white `+` icon. Opens Add Transaction sheet.

### Transaction List
- `FlatList` with `SectionList`-style grouping by date
- Section headers: "Today", "Yesterday", `DD MMM` for older dates (e.g. "24 Apr")
- Section header style: `text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`, `px-4 py-2`

### Transaction Row
- Height: ~64px, `bg-card rounded-xl`, grouped rows share rounded corners (top group: `rounded-t-xl rounded-b-sm`, middle: `rounded-sm`, bottom: `rounded-b-xl rounded-t-sm`)
- Left: 36×36 rounded square, background tinted by type:
  - Expense: `rgba(239,68,68,0.12)` with red letter
  - Income: `rgba(16,185,129,0.12)` with green letter
  - Transfer: `rgba(59,130,246,0.12)` with blue letter
  - Letter: first character of category name, `font-bold text-sm`
- Centre: merchant name (`font-semibold text-foreground text-sm`) + category (`text-[10px] uppercase tracking-wide text-muted-foreground`)
- Right: amount, `font-bold text-sm`
  - Expense: `text-destructive` with `-` prefix
  - Income: `text-primary` with `+` prefix
  - Transfer: `text-blue-400` with `→` prefix
- Amount formatted: `€1,234.56` (divide `amount_cents` by 100, use `toLocaleString`)

### Empty State
- Centred in the list area: `"No transactions yet"` in `text-muted-foreground`, with `"Tap + to add your first one"` below in smaller muted text

---

## Sheet: Add Transaction

Opens as a bottom sheet (`components/ui/sheet.tsx`). Scrollable content.

### Type Toggle
- Three segments: `Expense | Income | Transfer`
- Active segment background tint + border:
  - Expense: `rgba(239,68,68,0.15)` border `rgba(239,68,68,0.4)` text `#ef4444`
  - Income: `rgba(16,185,129,0.15)` border `rgba(16,185,129,0.4)` text `#10b981`
  - Transfer: `rgba(59,130,246,0.15)` border `rgba(59,130,246,0.4)` text `#3b82f6`
- Inactive segments: transparent background, `text-muted-foreground`

### Fields (in order)

| Field | Component | Required | Notes |
|---|---|---|---|
| Amount | `Input` numeric keyboard | Yes | Currency symbol prefix (`€`), stores as cents (`Math.round(float * 100)`) |
| Account | `Select` | Yes | Options from `useAccounts()`. Transfer shows second "To account" picker. |
| Date | Tappable row → native `DateTimePickerModal` | Yes | Defaults to `new Date()`, displays as `DD MMM YYYY` |
| Category | `Select` | Yes | Options from `useCategoriesWithSubs()` |
| Subcategory | `Select` | No | Only rendered when selected category has subcategories. Resets when category changes. |
| Merchant | `Input` | No | Free text |
| Note | `Input` | No | Free text |
| Tags | `Input` | No | Comma-separated string, split on save into JSON array: `JSON.stringify(value.split(',').map(t => t.trim()).filter(Boolean))` |
| Reimbursed | Toggle row | No | Only rendered when type is `Expense` |

### Save Button
- Full-width `Button` variant `default`, label "Save transaction"
- Disabled until: amount > 0, account selected, category selected
- On press: calls `transactionMutations.create(...)`, closes sheet on success
- On error: shows inline error text below the button

---

## Data Layer

### `lib/database/transactions.ts`

```ts
// useTransactions(workspaceId: string) → { data: Transaction[], isLoading, error }
// useTransactionMutations() → { create }
```

**`useTransactions`**
- PowerSync `useQuery`:
  ```sql
  SELECT * FROM transactions
  WHERE workspace_id = ?
  ORDER BY datetime DESC
  ```
- Returns `Transaction[]`

**`useTransactionMutations().create`**
```ts
create(workspaceId: string, data: {
  account_id: string;
  transaction_type: TransactionType;
  category: string;
  subcategory: string | null;
  amount_cents: number;
  currency: string;
  note: string | null;
  merchant: string | null;
  datetime: string;       // ISO string
  tags: string;           // JSON.stringify([...])
  reimbursed: number;     // 0 | 1
}) => Promise<string>     // returns new id
```

INSERT into `transactions` with `crypto.randomUUID()` id and `new Date().toISOString()` created_at.

---

## Files

| File | Action |
|---|---|
| `lib/database/transactions.ts` | Create — query + mutation hooks |
| `app/(app)/transactions/index.tsx` | Replace placeholder with full Activity screen |

---

## Out of Scope

- Edit / delete transaction
- Search or filter transactions
- Multi-select tags picker (tags entered as comma-separated text)
- Transaction detail screen
- Pagination / infinite scroll (load all for now, paginate in a later phase)
