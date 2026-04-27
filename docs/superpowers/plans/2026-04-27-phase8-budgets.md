# Phase 8 — Budgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Budgets feature — a list of event/project budgets with circular progress rings, a detail screen per budget with line items, and a budget item detail screen with transaction linking.

**Architecture:** Data layer in `lib/database/budgets.ts` (PowerSync queries + mutations). Shared `ProgressRing` SVG component in `components/ui/`. `TransactionRow` extracted from `transactions/index.tsx` so it can be reused on the item detail screen. Three Stack-navigated screens under `app/(app)/budgets/`.

**Tech Stack:** PowerSync (`useQuery`, `usePowerSync`), `react-native-svg` (bundled with Expo SDK 54), `@react-native-community/datetimepicker` (bundled with Expo), NativeWind, existing `Sheet` / `Input` / `Button` / `Select` components.

---

### Task 1: Extend types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the two new interfaces**

In `lib/types.ts`, append after `BudgetItemTransaction`:

```ts
export interface BudgetWithTotals extends Budget {
  spent_cents: number;        // SUM of all linked transaction amount_cents across all items
  total_planned_cents: number; // SUM of item planned_cents
}

export interface BudgetItemWithSpend extends BudgetItem {
  spent_cents: number;  // SUM of linked transaction amount_cents for this item
  currency: string;     // inherited from parent budget (via JOIN)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add BudgetWithTotals and BudgetItemWithSpend types"
```

---

### Task 2: ProgressRing component

**Files:**
- Create: `components/ui/ProgressRing.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  progress: number;   // 0–1, clamped for visual
  color: string;
  label: string;
  labelSize?: number;
}

export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  label,
  labelSize,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const offset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="#1f1f1f" strokeWidth={strokeWidth}
        />
        <Circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color, fontSize: labelSize ?? size * 0.2, fontWeight: "700" }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/ProgressRing.tsx
git commit -m "feat: ProgressRing SVG component"
```

---

### Task 3: Extract TransactionRow

**Files:**
- Create: `app/(app)/transactions/TransactionRow.tsx`
- Modify: `app/(app)/transactions/index.tsx`

- [ ] **Step 1: Create `TransactionRow.tsx`**

```tsx
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Transaction, TransactionType } from "~/lib/types";

export const TYPE_COLOR: Record<TransactionType, string> = {
  expense:  "#ef4444",
  income:   "#10b981",
  transfer: "#3b82f6",
};

export const TYPE_BG: Record<TransactionType, string> = {
  expense:  "rgba(239,68,68,0.12)",
  income:   "rgba(16,185,129,0.12)",
  transfer: "rgba(59,130,246,0.12)",
};

export const TYPE_PREFIX: Record<TransactionType, string> = {
  expense:  "-",
  income:   "+",
  transfer: "→",
};

export function formatAmount(cents: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  const value = (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${value}`;
}

interface TransactionRowProps {
  item: Transaction;
  index: number;
  total: number;
  /** When provided, renders a checkmark instead of the amount (used in picker) */
  selected?: boolean;
}

export function TransactionRow({ item, index, total, selected }: TransactionRowProps) {
  const type = item.transaction_type as TransactionType;
  const color = TYPE_COLOR[type] ?? "#ffffff";
  const bg   = TYPE_BG[type]    ?? "transparent";
  const prefix = TYPE_PREFIX[type] ?? "";
  const letter = (item.category?.[0] ?? "?").toUpperCase();

  const isFirst = index === 0;
  const isLast  = index === total - 1;

  return (
    <View
      style={{
        backgroundColor: "#141414",
        padding: 12,
        marginBottom: isLast ? 0 : 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderTopLeftRadius:     isFirst ? 12 : 3,
        borderTopRightRadius:    isFirst ? 12 : 3,
        borderBottomLeftRadius:  isLast  ? 12 : 3,
        borderBottomRightRadius: isLast  ? 12 : 3,
      }}
    >
      {/* Category letter icon */}
      <View
        style={{
          width: 36, height: 36,
          borderRadius: 10,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color, fontSize: 14, fontWeight: "700" }}>{letter}</Text>
      </View>

      {/* Merchant + category */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600" }}>
          {item.merchant || item.category}
        </Text>
        <Text
          style={{
            color: "#525252", fontSize: 10,
            textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1,
          }}
        >
          {item.category}
        </Text>
      </View>

      {/* Amount OR checkmark */}
      {selected !== undefined ? (
        <Ionicons
          name={selected ? "checkmark-circle" : "checkmark-circle-outline"}
          size={20}
          color={selected ? "#10b981" : "#525252"}
        />
      ) : (
        <Text style={{ color, fontSize: 14, fontWeight: "700" }}>
          {prefix}{formatAmount(item.amount_cents, item.currency)}
        </Text>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Update `transactions/index.tsx` to import from the extracted file**

Replace the inline helpers and `TransactionRow` definition in `app/(app)/transactions/index.tsx`. The new file starts with:

```tsx
import { useState } from "react";
import { View, Text, TouchableOpacity, SectionList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTransactions } from "~/lib/database/transactions";
import { AddTransactionSheet } from "./AddTransactionSheet";
import { TransactionRow } from "./TransactionRow";
import type { Transaction } from "~/lib/types";

function dateTitle(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

type Section = { title: string; data: Transaction[] };

function groupByDate(transactions: Transaction[]): Section[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = new Date(tx.datetime).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([, txs]) => ({
    title: dateTitle(txs[0].datetime),
    data: txs,
  }));
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const { data: transactions } = useTransactions();
  const sections = groupByDate(transactions);

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          Activity
        </Text>
        <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={8}>
          <Ionicons name="add" size={26} color="#10b981" />
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#525252", fontSize: 16, fontWeight: "600" }}>No transactions yet</Text>
          <Text style={{ color: "#525252", fontSize: 13 }}>Tap + to add your first one</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 16 }}
          renderSectionHeader={({ section }) => (
            <Text
              style={{
                color: "#525252", fontSize: 10, fontWeight: "600",
                textTransform: "uppercase", letterSpacing: 1,
                paddingHorizontal: 4, paddingTop: 16, paddingBottom: 6,
              }}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item, index, section }) => (
            <TransactionRow item={item} index={index} total={section.data.length} />
          )}
          stickySectionHeadersEnabled={false}
        />
      )}

      <AddTransactionSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/transactions/TransactionRow.tsx" "app/(app)/transactions/index.tsx"
git commit -m "refactor: extract TransactionRow to shared component"
```

---

### Task 4: Budget data layer

**Files:**
- Create: `lib/database/budgets.ts`

- [ ] **Step 1: Create the file**

```ts
import { useQuery, usePowerSync } from "@powersync/react-native";
import type { BudgetWithTotals, BudgetItemWithSpend, Transaction } from "../types";

// ─── colour helpers ──────────────────────────────────────────────────────────

export function spendColor(spentCents: number, plannedCents: number): string {
  if (plannedCents === 0) return "#10b981";
  const ratio = spentCents / plannedCents;
  if (ratio >= 1) return "#ef4444";
  if (ratio >= 0.75) return "#f59e0b";
  return "#10b981";
}

export function spendProgress(spentCents: number, plannedCents: number): number {
  if (plannedCents === 0) return 0;
  return spentCents / plannedCents;
}

export function spendPct(spentCents: number, plannedCents: number): string {
  if (plannedCents === 0) return "0%";
  return `${Math.round((spentCents / plannedCents) * 100)}%`;
}

// ─── queries ─────────────────────────────────────────────────────────────────

export function useBudgets(workspaceId: string) {
  return useQuery<BudgetWithTotals>(
    `SELECT
       b.*,
       COALESCE(SUM(t.amount_cents), 0)  AS spent_cents,
       COALESCE(SUM(bi.planned_cents), 0) AS total_planned_cents
     FROM budgets b
     LEFT JOIN budget_items bi            ON bi.budget_id        = b.id
     LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
     LEFT JOIN transactions t             ON t.id                = bit.transaction_id
     WHERE b.workspace_id = ?
     GROUP BY b.id
     ORDER BY
       CASE WHEN b.event_date IS NULL THEN 1 ELSE 0 END,
       b.event_date ASC,
       b.created_at DESC`,
    [workspaceId]
  );
}

export function useBudgetWithTotals(budgetId: string) {
  return useQuery<BudgetWithTotals>(
    `SELECT
       b.*,
       COALESCE(SUM(t.amount_cents), 0)  AS spent_cents,
       COALESCE(SUM(bi.planned_cents), 0) AS total_planned_cents
     FROM budgets b
     LEFT JOIN budget_items bi            ON bi.budget_id        = b.id
     LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
     LEFT JOIN transactions t             ON t.id                = bit.transaction_id
     WHERE b.id = ?
     GROUP BY b.id`,
    [budgetId]
  );
}

export function useBudgetItemsWithSpend(budgetId: string) {
  return useQuery<BudgetItemWithSpend>(
    `SELECT
       bi.*,
       b.currency,
       COALESCE(SUM(t.amount_cents), 0) AS spent_cents
     FROM budget_items bi
     JOIN budgets b                       ON b.id                = bi.budget_id
     LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
     LEFT JOIN transactions t             ON t.id                = bit.transaction_id
     WHERE bi.budget_id = ?
     GROUP BY bi.id
     ORDER BY bi.created_at ASC`,
    [budgetId]
  );
}

export function useBudgetItemWithSpend(itemId: string) {
  return useQuery<BudgetItemWithSpend>(
    `SELECT
       bi.*,
       b.currency,
       COALESCE(SUM(t.amount_cents), 0) AS spent_cents
     FROM budget_items bi
     JOIN budgets b                       ON b.id                = bi.budget_id
     LEFT JOIN budget_item_transactions bit ON bit.budget_item_id = bi.id
     LEFT JOIN transactions t             ON t.id                = bit.transaction_id
     WHERE bi.id = ?
     GROUP BY bi.id`,
    [itemId]
  );
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

export function useUnlinkedTransactions(itemId: string) {
  return useQuery<Transaction>(
    `SELECT * FROM transactions
     WHERE id NOT IN (
       SELECT transaction_id FROM budget_item_transactions WHERE budget_item_id = ?
     )
     ORDER BY datetime DESC`,
    [itemId]
  );
}

// ─── mutations ───────────────────────────────────────────────────────────────

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
      [id, workspaceId, data.name, data.currency, data.event_date, data.notes, new Date().toISOString()]
    );
    return id;
  };

  return { create };
}

export function useBudgetItemMutations() {
  const db = usePowerSync();

  const create = async (
    budgetId: string,
    data: { name: string; planned_cents: number }
  ): Promise<string> => {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO budget_items (id, budget_id, name, planned_cents, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, budgetId, data.name, data.planned_cents, null, new Date().toISOString()]
    );
    return id;
  };

  return { create };
}

export function useBudgetLinkMutations() {
  const db = usePowerSync();

  const link = async (itemId: string, transactionId: string): Promise<void> => {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT OR IGNORE INTO budget_item_transactions (id, budget_item_id, transaction_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [id, itemId, transactionId, new Date().toISOString()]
    );
  };

  const unlink = async (itemId: string, transactionId: string): Promise<void> => {
    await db.execute(
      `DELETE FROM budget_item_transactions WHERE budget_item_id = ? AND transaction_id = ?`,
      [itemId, transactionId]
    );
  };

  return { link, unlink };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/database/budgets.ts
git commit -m "feat: budget data layer — queries and mutations"
```

---

### Task 5: Budgets stack layout

**Files:**
- Create: `app/(app)/budgets/_layout.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Stack } from "expo-router";

export default function BudgetsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/budgets/_layout.tsx"
git commit -m "feat: budgets stack layout"
```

---

### Task 6: Budget list screen

**Files:**
- Modify: `app/(app)/budgets/index.tsx`

- [ ] **Step 1: Read the current placeholder**

The current file is a placeholder with "Coming in Phase 8". Replace it entirely.

- [ ] **Step 2: Write the full screen**

```tsx
import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useBudgets,
  useBudgetMutations,
  spendColor,
  spendProgress,
  spendPct,
} from "~/lib/database/budgets";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import { Sheet } from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { ProgressRing } from "~/components/ui/ProgressRing";
import type { BudgetWithTotals } from "~/lib/types";

function formatMoney(cents: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  return `${symbol}${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function BudgetCard({
  budget,
  onPress,
}: {
  budget: BudgetWithTotals;
  onPress: () => void;
}) {
  const color    = spendColor(budget.spent_cents, budget.total_planned_cents);
  const progress = spendProgress(budget.spent_cents, budget.total_planned_cents);
  const pct      = spendPct(budget.spent_cents, budget.total_planned_cents);

  const eventDateLabel = budget.event_date
    ? new Date(budget.event_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : null;

  const moneyLabel = `${formatMoney(budget.spent_cents, budget.currency)} / ${formatMoney(
    budget.total_planned_cents,
    budget.currency
  )}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#141414",
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <ProgressRing
        size={52}
        strokeWidth={4}
        progress={progress}
        color={color}
        label={pct}
        labelSize={11}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700", marginBottom: 2 }}>
          {budget.name}
        </Text>
        <Text style={{ color: "#525252", fontSize: 11 }}>
          {[eventDateLabel, moneyLabel].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const { data: budgets } = useBudgets(workspaceId ?? "");
  const { create } = useBudgetMutations();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [name, setName]           = useState("");
  const [currency, setCurrency]   = useState<"EUR" | "USD" | "GBP">("EUR");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const resetForm = () => {
    setName(""); setCurrency("EUR"); setEventDate(null); setNotes(""); setError("");
  };

  const handleSave = async () => {
    if (!workspaceId || !name.trim()) return;
    setSaving(true);
    try {
      await create(workspaceId, {
        name: name.trim(),
        currency,
        event_date: eventDate ? eventDate.toISOString().split("T")[0] : null,
        notes: notes.trim() || null,
      });
      resetForm();
      setSheetVisible(false);
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          Budgets
        </Text>
        <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={8}>
          <Ionicons name="add" size={26} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* List / empty state */}
      {budgets.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#525252", fontSize: 16, fontWeight: "600" }}>No budgets yet</Text>
          <Text style={{ color: "#525252", fontSize: 13 }}>Tap + to create one</Text>
        </View>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: insets.bottom + 16,
            gap: 10,
          }}
          renderItem={({ item }) => (
            <BudgetCard
              budget={item}
              onPress={() => router.push(`/budgets/${item.id}`)}
            />
          )}
        />
      )}

      {/* Add budget sheet */}
      <Sheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); resetForm(); }}
        title="New budget"
      >
        <View className="gap-5 pb-4">
          <Input
            label="Name"
            placeholder="e.g. Summer Holiday"
            value={name}
            onChangeText={setName}
          />

          <Select
            label="Currency"
            options={[
              { label: "EUR €", value: "EUR" },
              { label: "USD $", value: "USD" },
              { label: "GBP £", value: "GBP" },
            ]}
            value={currency}
            onChange={setCurrency}
          />

          {/* Event date */}
          <View>
            <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
              Event Date
            </Text>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={{
                height: 52,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#1f1f1f",
                backgroundColor: "#0a0a0a",
                paddingHorizontal: 16,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: eventDate ? "#ffffff" : "#525252",
                  fontSize: 15,
                  fontWeight: "500",
                }}
              >
                {eventDate
                  ? eventDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Optional"}
              </Text>
            </TouchableOpacity>
            {showPicker && (
              <DateTimePicker
                value={eventDate ?? new Date()}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  setShowPicker(false);
                  if (date) setEventDate(date);
                }}
              />
            )}
          </View>

          <Input
            label="Notes"
            placeholder="Optional"
            value={notes}
            onChangeText={setNotes}
          />

          {error ? (
            <Text style={{ color: "#ef4444", fontSize: 13 }}>{error}</Text>
          ) : null}

          <Button onPress={handleSave} loading={saving} disabled={!name.trim()}>
            Create budget
          </Button>
        </View>
      </Sheet>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/budgets/index.tsx"
git commit -m "feat: budget list screen with circular progress cards and add sheet"
```

---

### Task 7: Budget detail screen

**Files:**
- Create: `app/(app)/budgets/[id].tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useBudgetWithTotals,
  useBudgetItemsWithSpend,
  useBudgetItemMutations,
  spendColor,
  spendProgress,
  spendPct,
} from "~/lib/database/budgets";
import { Sheet } from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ProgressRing } from "~/components/ui/ProgressRing";
import type { BudgetItemWithSpend } from "~/lib/types";

function formatMoney(cents: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  return `${symbol}${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ItemRow({
  item,
  index,
  total,
  onPress,
}: {
  item: BudgetItemWithSpend;
  index: number;
  total: number;
  onPress: () => void;
}) {
  const color    = spendColor(item.spent_cents, item.planned_cents);
  const progress = spendProgress(item.spent_cents, item.planned_cents);
  const isFirst  = index === 0;
  const isLast   = index === total - 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#141414",
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: isLast ? 0 : 2,
        borderTopLeftRadius:     isFirst ? 12 : 3,
        borderTopRightRadius:    isFirst ? 12 : 3,
        borderBottomLeftRadius:  isLast  ? 12 : 3,
        borderBottomRightRadius: isLast  ? 12 : 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600" }}>{item.name}</Text>
        <Text style={{ color, fontSize: 14, fontWeight: "700" }}>
          {formatMoney(item.spent_cents, item.currency)} / {formatMoney(item.planned_cents, item.currency)}
        </Text>
      </View>
      <View style={{ backgroundColor: "#1f1f1f", borderRadius: 3, height: 3 }}>
        <View
          style={{
            backgroundColor: color,
            borderRadius: 3,
            height: 3,
            width: `${Math.min(progress * 100, 100)}%`,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { data: budgets } = useBudgetWithTotals(id);
  const { data: items }   = useBudgetItemsWithSpend(id);
  const { create }        = useBudgetItemMutations();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [itemName, setItemName]         = useState("");
  const [itemAmount, setItemAmount]     = useState("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  const budget = budgets[0];

  const resetForm = () => { setItemName(""); setItemAmount(""); setError(""); };

  const handleSave = async () => {
    if (!budget || !itemName.trim() || !itemAmount) return;
    const planned_cents = Math.round(parseFloat(itemAmount) * 100);
    if (isNaN(planned_cents) || planned_cents <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await create(budget.id, { name: itemName.trim(), planned_cents });
      resetForm();
      setSheetVisible(false);
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!budget) return null;

  const color     = spendColor(budget.spent_cents, budget.total_planned_cents);
  const progress  = spendProgress(budget.spent_cents, budget.total_planned_cents);
  const pct       = spendPct(budget.spent_cents, budget.total_planned_cents);
  const remaining = budget.total_planned_cents - budget.spent_cents;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#10b981" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={8}>
          <Text style={{ color: "#10b981", fontSize: 14, fontWeight: "600" }}>+ Item</Text>
        </TouchableOpacity>
      </View>

      {/* Budget name + date */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          {budget.name}
        </Text>
        {budget.event_date ? (
          <Text
            style={{
              color: "#525252", fontSize: 11,
              textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2,
            }}
          >
            {new Date(budget.event_date).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
          </Text>
        ) : null}
      </View>

      {/* Summary ring */}
      <View style={{ alignItems: "center", paddingBottom: 20 }}>
        <ProgressRing
          size={100}
          strokeWidth={7}
          progress={progress}
          color={color}
          label={pct}
          labelSize={20}
        />
        <View style={{ flexDirection: "row", gap: 32, marginTop: 14 }}>
          {[
            { label: "Spent",   value: formatMoney(budget.spent_cents, budget.currency),           color },
            { label: "Left",    value: formatMoney(remaining, budget.currency),                    color: "#525252" },
            { label: "Planned", value: formatMoney(budget.total_planned_cents, budget.currency),   color: "#525252" },
          ].map((stat) => (
            <View key={stat.label} style={{ alignItems: "center" }}>
              <Text style={{ color: stat.color, fontSize: 15, fontWeight: "700" }}>{stat.value}</Text>
              <Text
                style={{
                  color: "#525252", fontSize: 10,
                  textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2,
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Items list */}
      {items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#525252", fontSize: 14, fontWeight: "600" }}>No items yet</Text>
          <Text style={{ color: "#525252", fontSize: 12 }}>Tap + Item to add one</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item, index }) => (
            <ItemRow
              item={item}
              index={index}
              total={items.length}
              onPress={() => router.push(`/budgets/item/${item.id}`)}
            />
          )}
        />
      )}

      {/* Add item sheet */}
      <Sheet
        visible={sheetVisible}
        onClose={() => { setSheetVisible(false); resetForm(); }}
        title="Add item"
      >
        <View className="gap-5 pb-4">
          <Input
            label="Name"
            placeholder="e.g. Flights"
            value={itemName}
            onChangeText={setItemName}
          />
          <Input
            label="Planned amount"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={itemAmount}
            onChangeText={setItemAmount}
          />
          {error ? (
            <Text style={{ color: "#ef4444", fontSize: 13 }}>{error}</Text>
          ) : null}
          <Button
            onPress={handleSave}
            loading={saving}
            disabled={!itemName.trim() || !itemAmount}
          >
            Add item
          </Button>
        </View>
      </Sheet>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/budgets/[id].tsx"
git commit -m "feat: budget detail screen with summary ring, item rows, and add item sheet"
```

---

### Task 8: Budget item detail screen

**Files:**
- Create: `app/(app)/budgets/item/[id].tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useBudgetItemWithSpend,
  useLinkedTransactions,
  useUnlinkedTransactions,
  useBudgetLinkMutations,
  spendColor,
  spendProgress,
  spendPct,
} from "~/lib/database/budgets";
import { Sheet } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { ProgressRing } from "~/components/ui/ProgressRing";
import { TransactionRow } from "~/app/(app)/transactions/TransactionRow";
import type { Transaction } from "~/lib/types";

function formatMoney(cents: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency + " ";
  return `${symbol}${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function BudgetItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();

  const { data: items }       = useBudgetItemWithSpend(id);
  const { data: linkedTxns }  = useLinkedTransactions(id);
  const { data: unlinkedTxns } = useUnlinkedTransactions(id);
  const { link }              = useBudgetLinkMutations();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [linking, setLinking]             = useState(false);

  const item = items[0];
  if (!item) return null;

  const color    = spendColor(item.spent_cents, item.planned_cents);
  const progress = spendProgress(item.spent_cents, item.planned_cents);
  const pct      = spendPct(item.spent_cents, item.planned_cents);
  const remaining = item.planned_cents - item.spent_cents;

  const toggleSelect = (txId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(txId) ? next.delete(txId) : next.add(txId);
      return next;
    });
  };

  const handleLink = async () => {
    setLinking(true);
    try {
      await Promise.all([...selected].map((txId) => link(id, txId)));
      setSelected(new Set());
      setPickerVisible(false);
    } finally {
      setLinking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#10b981" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPickerVisible(true)} hitSlop={8}>
          <Text style={{ color: "#10b981", fontSize: 14, fontWeight: "600" }}>Link txn</Text>
        </TouchableOpacity>
      </View>

      {/* Item name */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          {item.name}
        </Text>
      </View>

      {/* Summary card */}
      <View
        style={{
          marginHorizontal: 12,
          marginBottom: 16,
          backgroundColor: "#141414",
          borderRadius: 16,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ color, fontSize: 22, fontWeight: "800" }}>
            {formatMoney(item.spent_cents, item.currency)}
          </Text>
          <Text style={{ color: "#525252", fontSize: 11, marginTop: 2 }}>
            of {formatMoney(item.planned_cents, item.currency)} planned
          </Text>
          <Text style={{ color: "#525252", fontSize: 11, marginTop: 1 }}>
            {formatMoney(remaining, item.currency)} remaining
          </Text>
        </View>
        <ProgressRing
          size={52}
          strokeWidth={4}
          progress={progress}
          color={color}
          label={pct}
          labelSize={11}
        />
      </View>

      {/* Section header */}
      <Text
        style={{
          color: "#525252", fontSize: 10, fontWeight: "600",
          textTransform: "uppercase", letterSpacing: 1,
          paddingHorizontal: 16, paddingBottom: 8,
        }}
      >
        Linked transactions
      </Text>

      {/* Linked list */}
      {linkedTxns.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#525252", fontSize: 14, fontWeight: "600" }}>
            No transactions linked yet
          </Text>
          <Text style={{ color: "#525252", fontSize: 12 }}>Tap "Link txn" to add one</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 16 }}
        >
          {linkedTxns.map((tx, index) => (
            <TransactionRow
              key={tx.id}
              item={tx}
              index={index}
              total={linkedTxns.length}
            />
          ))}
        </ScrollView>
      )}

      {/* Transaction picker sheet */}
      <Sheet
        visible={pickerVisible}
        onClose={() => { setPickerVisible(false); setSelected(new Set()); }}
        title="Link transactions"
      >
        <View className="gap-4 pb-4">
          {unlinkedTxns.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={{ color: "#525252", fontSize: 14 }}>
                All transactions already linked
              </Text>
            </View>
          ) : (
            <View>
              {unlinkedTxns.map((tx, index) => (
                <TouchableOpacity
                  key={tx.id}
                  onPress={() => toggleSelect(tx.id)}
                >
                  <TransactionRow
                    item={tx}
                    index={index}
                    total={unlinkedTxns.length}
                    selected={selected.has(tx.id)}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Button
            onPress={handleLink}
            loading={linking}
            disabled={selected.size === 0}
          >
            {selected.size === 0
              ? "Select transactions"
              : `Link ${selected.size} transaction${selected.size > 1 ? "s" : ""}`}
          </Button>
        </View>
      </Sheet>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/budgets/item/[id].tsx"
git commit -m "feat: budget item detail screen with linked transactions and picker sheet"
```
