import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import { useAccounts } from "~/lib/database/accounts";
import {
  useMetricsSummary,
  useCategoryBreakdown,
  useMonthlyTrend,
  useTopMerchants,
  useLargestExpense,
  generateMonthRange,
} from "~/lib/database/metrics";

type Period = "this-month" | "last-month" | "6-months" | "year";

const MAX_BAR_HEIGHT = 80;

function getPeriodRange(period: Period): {
  from: string;
  to: string;
  trendMonths: number;
} {
  const now = new Date();
  // Use end of today so transactions added during the day are always included
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  switch (period) {
    case "this-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to: endOfToday,
        trendMonths: 6,
      };
    case "last-month": {
      const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      return {
        from: new Date(y, m, 1).toISOString(),
        to:   new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString(),
        trendMonths: 6,
      };
    }
    case "6-months":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString(),
        to: endOfToday,
        trendMonths: 6,
      };
    case "year":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString(),
        to: endOfToday,
        trendMonths: 12,
      };
  }
}

function formatMoney(currency: string, cents: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function MetricsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { workspaceId } = useWorkspace();
  const [period, setPeriod] = useState<Period>("this-month");

  const PERIOD_LABELS: { key: Period; label: string }[] = [
    { key: "this-month", label: t("metrics.periods.thisMonth") },
    { key: "last-month", label: t("metrics.periods.lastMonth") },
    { key: "6-months",   label: t("metrics.periods.sixMonths") },
    { key: "year",       label: t("metrics.periods.year") },
  ];
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { from, to, trendMonths } = useMemo(() => getPeriodRange(period), [period]);

  // Trend window: always last trendMonths calendar months up to now
  const trendFrom = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - (trendMonths - 1), 1).toISOString();
  }, [trendMonths]);
  const trendTo = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  }, []);

  const ws = workspaceId ?? "";
  const { data: accounts } = useAccounts();
  const currency = accounts[0]?.currency ?? "EUR";

  const { data: summary,    isLoading: summaryLoading }    = useMetricsSummary(ws, from, to);
  const { data: categories, isLoading: categoriesLoading } = useCategoryBreakdown(ws, from, to);
  const { data: trendData,  isLoading: trendLoading }      = useMonthlyTrend(ws, trendFrom, trendTo);
  const { data: merchants }                                 = useTopMerchants(ws, from, to);
  const { data: largestExpense }                            = useLargestExpense(ws, from, to);
  const isLoading = summaryLoading || categoriesLoading || trendLoading;

  // Derived stats
  const daysInPeriod = useMemo(() => {
    const diff = new Date(to).getTime() - new Date(from).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [from, to]);

  const savingsRate = (summary?.income_cents ?? 0) > 0
    ? Math.round(((summary?.income_cents ?? 0) - (summary?.expense_cents ?? 0)) / (summary?.income_cents ?? 1) * 100)
    : null;

  const avgDailySpend = (summary?.expense_cents ?? 0) / daysInPeriod;

  const savedCents = (summary?.income_cents ?? 0) - (summary?.expense_cents ?? 0);

  // Merge trend query results with full month range (fill zeros for empty months)
  const monthLabels = useMemo(() => generateMonthRange(trendMonths), [trendMonths]);
  const trendByMonth = useMemo(() => {
    const map = new Map((trendData ?? []).map((r) => [r.month, r]));
    return monthLabels.map(
      (month) => map.get(month) ?? { month, income_cents: 0, expense_cents: 0 }
    );
  }, [trendData, monthLabels]);

  const maxValue = useMemo(
    () => Math.max(...trendByMonth.map((m) => Math.max(m.income_cents, m.expense_cents)), 1),
    [trendByMonth]
  );

  const maxCategoryTotal = categories[0]?.total_cents ?? 1;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }}>
          {t("metrics.title")}
        </Text>
      </View>

      {/* Period picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}
      >
        {PERIOD_LABELS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => { setPeriod(key); setExpandedCategory(null); }}
            style={{
              backgroundColor: period === key ? "#10b981" : "#1f1f1f",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: period === key ? "#ffffff" : "#888888",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Scrollable body */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#10b981" />
        </View>
      ) : <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
      >
        {/* ── Section 1: Summary row ── */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { label: t("metrics.summary.income"), value: summary?.income_cents ?? 0,  color: "#10b981" },
            { label: t("metrics.summary.spent"),  value: summary?.expense_cents ?? 0, color: "#ef4444" },
            {
              label: t("metrics.summary.saved"),
              value: savedCents,
              color: savedCents >= 0 ? "#10b981" : "#ef4444",
            },
          ].map(({ label, value, color }) => (
            <View
              key={label}
              style={{
                flex: 1,
                backgroundColor: "#141414",
                borderRadius: 16,
                padding: 12,
              }}
            >
              <Text
                style={{
                  color: "#525252",
                  fontSize: 10,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 4,
                }}
              >
                {label}
              </Text>
              <Text style={{ color, fontSize: 18, fontWeight: "800" }}>
                {formatMoney(currency,value)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Section 2: Savings rate + Avg daily spend ── */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* Savings rate */}
          <View style={{ flex: 1, backgroundColor: "#141414", borderRadius: 16, padding: 12 }}>
            <Text style={{ color: "#525252", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              {t("metrics.savingsRate")}
            </Text>
            {savingsRate !== null ? (
              <Text style={{ color: savingsRate >= 0 ? "#10b981" : "#ef4444", fontSize: 22, fontWeight: "800" }}>
                {savingsRate}%
              </Text>
            ) : (
              <Text style={{ color: "#525252", fontSize: 14, fontWeight: "600" }}>—</Text>
            )}
          </View>

          {/* Avg daily spend */}
          <View style={{ flex: 1, backgroundColor: "#141414", borderRadius: 16, padding: 12 }}>
            <Text style={{ color: "#525252", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              {t("metrics.avgDaily")}
            </Text>
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "800" }}>
              {formatMoney(currency, Math.round(avgDailySpend))}
            </Text>
          </View>
        </View>

        {/* ── Section 3: Largest expense ── */}
        {largestExpense && (
          <View style={{ backgroundColor: "#141414", borderRadius: 16, padding: 16 }}>
            <Text style={{ color: "#525252", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              {t("metrics.largestExpense")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                  {largestExpense.merchant || largestExpense.category}
                </Text>
                <Text style={{ color: "#525252", fontSize: 12, marginTop: 2 }}>
                  {largestExpense.merchant ? largestExpense.category : ""}
                  {largestExpense.merchant ? " · " : ""}
                  {new Date(largestExpense.datetime).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </Text>
              </View>
              <Text style={{ color: "#ef4444", fontSize: 18, fontWeight: "800", marginLeft: 12 }}>
                {formatMoney(currency, largestExpense.amount_cents)}
              </Text>
            </View>
          </View>
        )}

        {/* ── Section 4: Top Merchants ── */}
        {merchants.length > 0 && (
          <View style={{ backgroundColor: "#141414", borderRadius: 16, padding: 16 }}>
            <Text style={{ color: "#525252", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              {t("metrics.topMerchants")}
            </Text>
            {merchants.map((m, i) => (
              <View
                key={m.merchant}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: i < merchants.length - 1 ? 10 : 0 }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#1f1f1f", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                  <Text style={{ color: "#525252", fontSize: 10, fontWeight: "700" }}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, color: "#ffffff", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{m.merchant}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }}>{formatMoney(currency, m.total_cents)}</Text>
                  <Text style={{ color: "#525252", fontSize: 10, marginTop: 1 }}>{m.count}×</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Section 5: Top Categories ── */}
        <View style={{ backgroundColor: "#141414", borderRadius: 16, padding: 16 }}>
          <Text
            style={{
              color: "#525252",
              fontSize: 10,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            {t("metrics.topCategories")}
          </Text>

          {categories.length === 0 ? (
            <Text
              style={{
                color: "#525252",
                fontSize: 13,
                textAlign: "center",
                paddingVertical: 8,
              }}
            >
              {t("metrics.noSpending")}
            </Text>
          ) : (
            categories.map((cat) => {
              const isExpanded = expandedCategory === cat.category;
              return (
                <View key={cat.category} style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedCategory(isExpanded ? null : cat.category)
                    }
                    style={{ marginBottom: isExpanded ? 6 : 0 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: isExpanded ? "#10b981" : "#ffffff",
                          fontSize: 13,
                          fontWeight: "600",
                        }}
                      >
                        {cat.category}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text
                          style={{
                            color: isExpanded ? "#10b981" : "#ffffff",
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          {formatMoney(currency,cat.total_cents)}
                        </Text>
                        <Text style={{ color: "#525252", fontSize: 12 }}>
                          {isExpanded ? "↑" : "›"}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: "#1f1f1f", borderRadius: 3, height: 4 }}>
                      <View
                        style={{
                          backgroundColor: "#10b981",
                          borderRadius: 3,
                          height: 4,
                          width: `${Math.round(
                            (cat.total_cents / maxCategoryTotal) * 100
                          )}%`,
                        }}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && cat.subcategories.length > 0 && (
                    <View
                      style={{
                        backgroundColor: "#0a0a0a",
                        borderRadius: 10,
                        padding: 10,
                        gap: 6,
                      }}
                    >
                      {cat.subcategories.map((sub) => (
                        <View
                          key={sub.name}
                          style={{ flexDirection: "row", justifyContent: "space-between" }}
                        >
                          <Text style={{ color: "#888888", fontSize: 12 }}>{sub.name}</Text>
                          <Text style={{ color: "#888888", fontSize: 12, fontWeight: "600" }}>
                            {formatMoney(currency,sub.total_cents)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── Section 6: Monthly Cash Flow ── */}
        <View style={{ backgroundColor: "#141414", borderRadius: 16, padding: 16 }}>
          <Text
            style={{
              color: "#525252",
              fontSize: 10,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            {t("metrics.cashFlow")}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 6,
              height: MAX_BAR_HEIGHT + 20,
            }}
          >
            {trendByMonth.map((month) => {
              const incomeH = Math.max(
                Math.round((month.income_cents / maxValue) * MAX_BAR_HEIGHT),
                2
              );
              const expenseH = Math.max(
                Math.round((month.expense_cents / maxValue) * MAX_BAR_HEIGHT),
                2
              );
              const label = new Date(month.month + "-02").toLocaleDateString("en-GB", {
                month: "short",
              });
              return (
                <View key={month.month} style={{ flex: 1, alignItems: "center" }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      gap: 2,
                      height: MAX_BAR_HEIGHT,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        backgroundColor: "#10b981",
                        borderRadius: 3,
                        height: incomeH,
                      }}
                    />
                    <View
                      style={{
                        width: 8,
                        backgroundColor: "#ef4444",
                        borderRadius: 3,
                        height: expenseH,
                      }}
                    />
                  </View>
                  <Text style={{ color: "#525252", fontSize: 9, marginTop: 4 }}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View
                style={{ width: 8, height: 8, backgroundColor: "#10b981", borderRadius: 2 }}
              />
              <Text style={{ color: "#525252", fontSize: 10 }}>{t("metrics.summary.income")}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View
                style={{ width: 8, height: 8, backgroundColor: "#ef4444", borderRadius: 2 }}
              />
              <Text style={{ color: "#525252", fontSize: 10 }}>{t("metrics.summary.spent")}</Text>
            </View>
          </View>
        </View>
      </ScrollView>}
    </View>
  );
}
