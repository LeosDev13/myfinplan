import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkspace } from "~/app/providers/WorkspaceProvider";
import {
  useMetricsSummary,
  useCategoryBreakdown,
  useMonthlyTrend,
  generateMonthRange,
} from "~/lib/database/metrics";

type Period = "this-month" | "last-month" | "6-months" | "year";

const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: "this-month",  label: "This month" },
  { key: "last-month",  label: "Last month" },
  { key: "6-months",    label: "6 months" },
  { key: "year",        label: "Year" },
];

const MAX_BAR_HEIGHT = 80;

function getPeriodRange(period: Period): {
  from: string;
  to: string;
  trendMonths: number;
} {
  const now = new Date();
  const to = now.toISOString();
  switch (period) {
    case "this-month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to,
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
        to,
        trendMonths: 6,
      };
    case "year":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString(),
        to,
        trendMonths: 12,
      };
  }
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function MetricsScreen() {
  const insets = useSafeAreaInsets();
  const { workspaceId } = useWorkspace();
  const [period, setPeriod] = useState<Period>("this-month");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { from, to, trendMonths } = useMemo(() => getPeriodRange(period), [period]);

  // Trend window: always last trendMonths calendar months up to now
  const trendFrom = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - (trendMonths - 1), 1).toISOString();
  }, [trendMonths]);
  const trendTo = useMemo(() => new Date().toISOString(), []);

  const ws = workspaceId ?? "";
  const { data: summary }    = useMetricsSummary(ws, from, to);
  const { data: categories } = useCategoryBreakdown(ws, from, to);
  const { data: trendData }  = useMonthlyTrend(ws, trendFrom, trendTo);

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
          Metrics
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
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
      >
        {/* ── Section 1: Summary row ── */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { label: "Income", value: summary?.income_cents ?? 0,  color: "#10b981" },
            { label: "Spent",  value: summary?.expense_cents ?? 0, color: "#ef4444" },
            {
              label: "Saved",
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
                {formatMoney(value)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Section 2: Top Categories ── */}
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
            Top Categories
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
              No spending data for this period
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
                          {formatMoney(cat.total_cents)}
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
                            {formatMoney(sub.total_cents)}
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

        {/* ── Section 3: Monthly Cash Flow ── */}
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
            Monthly Cash Flow
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
              <Text style={{ color: "#525252", fontSize: 10 }}>Income</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View
                style={{ width: 8, height: 8, backgroundColor: "#ef4444", borderRadius: 2 }}
              />
              <Text style={{ color: "#525252", fontSize: 10 }}>Expenses</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
