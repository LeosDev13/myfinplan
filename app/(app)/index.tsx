import { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import { useAccounts } from "~/lib/database/accounts";
import { useTransactions } from "~/lib/database/transactions";
import { useMetricsSummary } from "~/lib/database/metrics";
import { TransactionRow } from "~/app/(app)/transactions/TransactionRow";
import type { AccountWithBalance } from "~/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function currentMonthLabel(): string {
  return new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ─── account card ───────────────────────────────────────────────────────────

function AccountCard({ account }: { account: AccountWithBalance }) {
  const isPositive = account.balance_cents >= 0;
  return (
    <View
      style={{
        backgroundColor: "#141414",
        borderRadius: 16,
        padding: 16,
        width: 160,
        gap: 8,
      }}
    >
      <Text style={{ color: "#525252", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 }}>
        {account.account_type === "shared" ? "Shared" : account.owner}
      </Text>
      <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
        {account.name}
      </Text>
      <Text style={{ color: isPositive ? "#10b981" : "#ef4444", fontSize: 18, fontWeight: "800" }}>
        {formatMoney(account.balance_cents, account.currency)}
      </Text>
    </View>
  );
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { workspaceId } = useWorkspace();

  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();

  const now = useMemo(() => new Date(), []);
  const monthFrom = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), [now]);
  const monthTo = useMemo(() => now.toISOString(), [now]);

  const { data: summary } = useMetricsSummary(workspaceId ?? null, monthFrom, monthTo);

  const netWorthCents = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance_cents, 0),
    [accounts]
  );

  const savedCents = (summary?.income_cents ?? 0) - (summary?.expense_cents ?? 0);
  const recentTransactions = transactions.slice(0, 5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0a0a0a" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ color: "#525252", fontSize: 13 }}>{greeting()}</Text>
        <Text style={{ color: "#ffffff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 }}>
          Dashboard
        </Text>
      </View>

      {/* ── Net worth ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <View style={{ backgroundColor: "#141414", borderRadius: 20, padding: 20 }}>
          <Text style={{ color: "#525252", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
            Net Worth
          </Text>
          <Text
            style={{
              color: netWorthCents >= 0 ? "#ffffff" : "#ef4444",
              fontSize: 36,
              fontWeight: "800",
              letterSpacing: -1,
              marginTop: 6,
            }}
          >
            {formatMoney(netWorthCents)}
          </Text>
          <Text style={{ color: "#525252", fontSize: 12, marginTop: 4 }}>
            Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* ── This month summary ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <Text style={{ color: "#525252", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          {currentMonthLabel()}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { label: "Income", value: summary?.income_cents ?? 0, color: "#10b981" },
            { label: "Spent",  value: summary?.expense_cents ?? 0, color: "#ef4444" },
            { label: "Saved",  value: savedCents, color: savedCents >= 0 ? "#10b981" : "#ef4444" },
          ].map(({ label, value, color }) => (
            <View
              key={label}
              style={{ flex: 1, backgroundColor: "#141414", borderRadius: 14, padding: 12 }}
            >
              <Text style={{ color: "#525252", fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                {label}
              </Text>
              <Text style={{ color, fontSize: 15, fontWeight: "800" }}>
                {formatMoney(value)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Accounts ── */}
      {accounts.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <View style={{ paddingHorizontal: 16, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#525252", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
              Accounts
            </Text>
            <TouchableOpacity onPress={() => router.push("/(app)/more/accounts")}>
              <Text style={{ color: "#10b981", fontSize: 12, fontWeight: "600" }}>See all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            renderItem={({ item }) => <AccountCard account={item} />}
          />
        </View>
      )}

      {/* ── Recent activity ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: "#525252", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
            Recent Activity
          </Text>
          <TouchableOpacity onPress={() => router.push("/(app)/transactions")}>
            <Text style={{ color: "#10b981", fontSize: 12, fontWeight: "600" }}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={{ backgroundColor: "#141414", borderRadius: 16, padding: 24, alignItems: "center", gap: 6 }}>
            <Text style={{ color: "#525252", fontSize: 14, fontWeight: "600" }}>No transactions yet</Text>
            <Text style={{ color: "#525252", fontSize: 12 }}>Tap + to add your first one</Text>
          </View>
        ) : (
          <View style={{ borderRadius: 12, overflow: "hidden" }}>
            {recentTransactions.map((tx, index) => (
              <TransactionRow
                key={tx.id}
                item={tx}
                index={index}
                total={recentTransactions.length}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Quick action ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <TouchableOpacity
          onPress={() => router.push("/(app)/transactions/add")}
          style={{
            backgroundColor: "#10b981",
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
          <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Add Transaction</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
