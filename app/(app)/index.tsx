import { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import { useAccounts } from "~/lib/database/accounts";
import { useTransactions } from "~/lib/database/transactions";
import { useMetricsSummary } from "~/lib/database/metrics";
import { useCategoriesWithSubs, useCategorySeed } from "~/lib/database/categories";
import { TransactionRow } from "~/app/(app)/transactions/TransactionRow";
import type { AccountWithBalance } from "~/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function greeting(t: (key: string) => string): string {
  const h = new Date().getHours();
  if (h < 12) return t("greeting.morning");
  if (h < 18) return t("greeting.afternoon");
  return t("greeting.evening");
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
  const { t } = useTranslation();
  const { workspaceId } = useWorkspace();

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: categories } = useCategoriesWithSubs();
  const { seedDefaults } = useCategorySeed();
  const { data: transactions } = useTransactions();

  const now = useMemo(() => new Date(), []);
  const monthFrom = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), [now]);
  const monthTo = useMemo(() => now.toISOString(), [now]);

  const { data: summary } = useMetricsSummary(workspaceId ?? "", monthFrom, monthTo);

  const netWorthCents = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance_cents, 0),
    [accounts]
  );

  const savedCents = (summary?.income_cents ?? 0) - (summary?.expense_cents ?? 0);
  const currency = accounts[0]?.currency ?? "EUR";
  const recentTransactions = transactions.slice(0, 5);

  if (accountsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  if (accounts.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: "#525252", fontSize: 13 }}>{greeting(t)}</Text>
          <Text style={{ color: "#ffffff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 }}>
            {t("onboarding.greeting")}
          </Text>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 16, justifyContent: "center", gap: 32 }}>
          {/* Steps */}
          <View style={{ gap: 16 }}>
            {[
              { step: "1", title: t("onboarding.step1Title"), desc: t("onboarding.step1Desc") },
              { step: "2", title: t("onboarding.step2Title"), desc: t("onboarding.step2Desc") },
              { step: "3", title: t("onboarding.step3Title"), desc: t("onboarding.step3Desc") },
            ].map(({ step, title, desc }) => (
              <View key={step} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: "#10b981",
                  alignItems: "center", justifyContent: "center",
                  marginTop: 1,
                }}>
                  <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "800" }}>{step}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700", marginBottom: 2 }}>{title}</Text>
                  <Text style={{ color: "#525252", fontSize: 13, lineHeight: 18 }}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={async () => {
              if (workspaceId && categories.length === 0) {
                await seedDefaults(workspaceId);
              }
              router.push("/(app)/more/accounts/add");
            }}
            style={{
              backgroundColor: "#10b981",
              borderRadius: 16,
              padding: 18,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>{t("onboarding.cta")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0a0a0a" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ color: "#525252", fontSize: 13 }}>{greeting(t)}</Text>
        <Text style={{ color: "#ffffff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 }}>
          {t("dashboard.title")}
        </Text>
      </View>

      {/* ── Net worth ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <View style={{ backgroundColor: "#141414", borderRadius: 20, padding: 20 }}>
          <Text style={{ color: "#525252", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
            {t("dashboard.netWorth")}
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
            {formatMoney(netWorthCents, currency)}
          </Text>
          <Text style={{ color: "#525252", fontSize: 12, marginTop: 4 }}>
            Across {accounts.length} {accounts.length !== 1 ? t("dashboard.accounts_plural") : t("dashboard.accounts")}
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
            { label: t("metrics.summary.income"), value: summary?.income_cents ?? 0, color: "#10b981" },
            { label: t("metrics.summary.spent"),  value: summary?.expense_cents ?? 0, color: "#ef4444" },
            { label: t("metrics.summary.saved"),  value: savedCents, color: savedCents >= 0 ? "#10b981" : "#ef4444" },
          ].map(({ label, value, color }) => (
            <View
              key={label}
              style={{ flex: 1, backgroundColor: "#141414", borderRadius: 14, padding: 12 }}
            >
              <Text style={{ color: "#525252", fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                {label}
              </Text>
              <Text style={{ color, fontSize: 15, fontWeight: "800" }}>
                {formatMoney(value, currency)}
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
              {t("accounts.title")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(app)/more/accounts")}>
              <Text style={{ color: "#10b981", fontSize: 12, fontWeight: "600" }}>{t("common.seeAll")}</Text>
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
            {t("dashboard.recentActivity")}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(app)/transactions")}>
            <Text style={{ color: "#10b981", fontSize: 12, fontWeight: "600" }}>{t("common.seeAll")}</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={{ backgroundColor: "#141414", borderRadius: 16, padding: 24, alignItems: "center", gap: 6 }}>
            <Text style={{ color: "#525252", fontSize: 14, fontWeight: "600" }}>{t("dashboard.noTransactions")}</Text>
            <Text style={{ color: "#525252", fontSize: 12 }}>{t("dashboard.noTransactionsHint")}</Text>
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
          <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>{t("dashboard.addTransaction")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
